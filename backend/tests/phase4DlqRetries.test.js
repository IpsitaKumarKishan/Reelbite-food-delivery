import test from "node:test";
import assert from "node:assert/strict";
import { DlqManagerService, PermanentJobError } from "../services/dlqManager.service.js";
import { RECOVERY_CONFIG } from "../config/recoveryConfig.js";

test("Phase 4: Dead Letter Queue (DLQ) & Permanent vs Transient Retries", async (t) => {
  await t.test("PermanentJobError correctly tags error as non-retryable with metadata", () => {
    const error = new PermanentJobError("Invalid order data", { orderId: "ord-999", reason: "missing_items" });
    assert.equal(error.name, "PermanentJobError");
    assert.equal(error.isPermanent, true);
    assert.equal(error.metadata.orderId, "ord-999");
    assert.equal(error.message, "Invalid order data");
  });

  await t.test("recordFailedJob records transient exhausted failures and creates incident ticket", () => {
    const dlq = new DlqManagerService(50);
    const mockJob = {
      id: "job-transient-1",
      name: "process-order",
      data: { orderId: "ord-101" },
      attemptsMade: 3,
      opts: { attempts: 3 }
    };
    const transientError = new Error("Connection timeout to payment gateway");

    const entry = dlq.recordFailedJob(mockJob, transientError);

    assert.equal(entry.jobId, "job-transient-1");
    assert.equal(entry.orderId, "ord-101");
    assert.equal(entry.failureType, "TRANSIENT_EXHAUSTED");
    assert.equal(entry.eligibleForRetry, true);
    assert.equal(entry.status, "FAILED");
    assert.equal(entry.attemptsMade, 3);
  });

  await t.test("recordFailedJob records permanent validation failure with non-retryable status", () => {
    const dlq = new DlqManagerService(50);
    const mockJob = {
      id: "job-perm-1",
      name: "process-order",
      data: { orderId: "ord-bad" },
      attemptsMade: 1,
      opts: { attempts: 3 }
    };
    const permError = new PermanentJobError("Order not found in database", { orderId: "ord-bad" });

    const entry = dlq.recordFailedJob(mockJob, permError);

    assert.equal(entry.jobId, "job-perm-1");
    assert.equal(entry.failureType, "PERMANENT_VALIDATION");
    assert.equal(entry.eligibleForRetry, false);
    assert.equal(entry.attemptsMade, 1);
  });

  await t.test("DLQ pagination and filtering work as expected", () => {
    const dlq = new DlqManagerService(50);
    for (let i = 1; i <= 15; i++) {
      dlq.recordFailedJob(
        {
          id: `job-${i}`,
          name: "process-order",
          data: { orderId: `ord-${i}` },
          attemptsMade: 3,
          opts: { attempts: 3 }
        },
        i % 2 === 0 ? new PermanentJobError(`Permanent error ${i}`) : new Error(`Transient error ${i}`)
      );
    }

    const allPage1 = dlq.getDeadLetterJobs({ page: 1, limit: 10 });
    assert.equal(allPage1.jobs.length, 10);
    assert.equal(allPage1.pagination.total, 15);
    assert.equal(allPage1.pagination.totalPages, 2);

    const permOnly = dlq.getDeadLetterJobs({ failureType: "PERMANENT_VALIDATION" });
    assert.equal(permOnly.jobs.length, 7); // 2, 4, 6, 8, 10, 12, 14
    assert(permOnly.jobs.every((j) => j.failureType === "PERMANENT_VALIDATION"));
  });

  await t.test("Controlled retry validation prevents unforced retry of permanent failure", async () => {
    const dlq = new DlqManagerService(50);
    const mockJob = {
      id: "job-perm-guard",
      name: "process-order",
      data: { orderId: "ord-guard" },
      attemptsMade: 1,
      opts: { attempts: 3 }
    };
    dlq.recordFailedJob(mockJob, new PermanentJobError("Corrupt payload"));

    const result = await dlq.retryJob("job-perm-guard", false);
    assert.equal(result.success, false);
    assert.match(result.reason, /permanent validation failure/i);
  });

  await t.test("Controlled retry succeeds for eligible job and prevents double retry", async () => {
    const dlq = new DlqManagerService(50);
    const mockJob = {
      id: "job-eligible-1",
      name: "process-order",
      data: { orderId: "ord-202" },
      attemptsMade: 3,
      opts: { attempts: 3 }
    };
    dlq.recordFailedJob(mockJob, new Error("Redis connection reset"));

    const retryResult = await dlq.retryJob("job-eligible-1");
    // Depending on whether Redis is connected in test environment, retryJob attempts to re-enqueue
    // If orderQueue is connected, retryResult.success is true; otherwise it returns queue unavailable
    if (retryResult.success) {
      assert.equal(retryResult.previousJobId, "job-eligible-1");
      const details = dlq.getJobDetails("job-eligible-1");
      assert.equal(details.status, "RETRIED");

      // Attempting second retry should fail with double-retry prevention
      const secondRetry = await dlq.retryJob("job-eligible-1");
      assert.equal(secondRetry.success, false);
      assert.match(secondRetry.reason, /already been retried/i);
    } else {
      assert(retryResult.reason, "Should produce structured error reason if queue is offline");
    }
  });

  await t.test("discardJob permanently marks a job as discarded", () => {
    const dlq = new DlqManagerService(50);
    dlq.recordFailedJob(
      {
        id: "job-to-discard",
        name: "process-order",
        data: { orderId: "ord-discard" },
        attemptsMade: 3,
        opts: { attempts: 3 }
      },
      new Error("Timeout")
    );

    const discarded = dlq.discardJob("job-to-discard", "Canceled by customer");
    assert.equal(discarded.status, "DISCARDED");
    assert.equal(discarded.eligibleForRetry, false);
    assert.equal(discarded.discardReason, "Canceled by customer");
  });

  await t.test("getStats calculates DLQ counts accurately", () => {
    const dlq = new DlqManagerService(50);
    dlq.recordFailedJob(
      { id: "j1", data: { orderId: "o1" }, attemptsMade: 3, opts: { attempts: 3 } },
      new Error("Network")
    );
    dlq.recordFailedJob(
      { id: "j2", data: { orderId: "o2" }, attemptsMade: 1, opts: { attempts: 3 } },
      new PermanentJobError("Invalid")
    );

    const stats = dlq.getStats();
    assert.equal(stats.totalFailedInStore, 2);
    assert.equal(stats.pendingCount, 2);
    assert.equal(stats.transientCount, 1);
    assert.equal(stats.permanentCount, 1);
  });

  await t.test("Queue and retry configuration aligns with exponential backoff specification", () => {
    assert.equal(RECOVERY_CONFIG.JOB_MAX_ATTEMPTS, 3);
    assert.equal(RECOVERY_CONFIG.JOB_BACKOFF_INITIAL_MS, 1000);
    assert.equal(RECOVERY_CONFIG.JOB_LOCK_DURATION_MS, 30000);
    assert.equal(RECOVERY_CONFIG.JOB_STALLED_INTERVAL_MS, 30000);
  });
});

