# Cloud Deployment & Containerization Guide: ReelBite

**System:** ReelBite Food Delivery & Video-Commerce Platform  
**Feature:** Resource-Aware Adaptive Concurrency Control for Distributed Job Processing  
**Host Target:** AWS EC2 Instance (`13.127.5.34` or any Linux/Ubuntu Cloud VM)  
**Container Runtime:** Docker Engine 24+ & Docker Compose v2  

---

## 1. Cloud Architecture Overview

In production on AWS EC2, the system runs as an isolated micro-service network:

```
[Internet Traffic]
       │
       ▼ (Port 80 / 443)
┌──────────────────────────────────────────────────────────┐
│ AWS EC2 Host (Ubuntu Linux)                              │
│                                                          │
│  ┌─────────────────────────┐                             │
│  │ reelbite-frontend       │ (Nginx serving React SPA)   │
│  │ Container (:80)         │                             │
│  └───────────┬─────────────┘                             │
│              │ (Reverse Proxy: /api/* & /socket.io/*)     │
│              ▼                                           │
│  ┌─────────────────────────┐                             │
│  │ reelbite-backend        │ (Express, Controller,       │
│  │ Container (:5000)       │  In-Memory Adaptive Worker) │
│  └───────────┬─────────────┘                             │
│              │                                           │
│              ├─────────────────────────────────┐         │
│              ▼ (Job Events: 6379)              ▼         │
│  ┌─────────────────────────┐       ┌──────────────────┐  │
│  │ reelbite-redis          │       │ MongoDB Atlas    │  │
│  │ Container (Redis 7)     │       │ Cloud Cluster    │  │
│  └─────────────────────────┘       └──────────────────┘  │
│              ▲                                           │
│              │ (Optional Dedicated Worker Profile)       │
│  ┌───────────┴─────────────┐                             │
│  │ reelbite-worker (xN)    │ (Horizontal Worker Pods)    │
│  └─────────────────────────┘                             │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites on AWS EC2

Ensure the following packages are installed on your EC2 instance:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git curl
sudo usermod -aG docker ubuntu
# Log out and log back in for docker group to take effect
```

Verify Docker installation:
```bash
docker --version
docker compose version
```

---

## 3. Deployment Steps

### Step 1: Clone or Pull Code on EC2
```bash
cd /home/ubuntu/
# If existing repository:
cd "food delivery" || cd food-delivery
git pull origin main
```

### Step 2: Verify Production Environment Files
Verify that `.env` in the root directory contains your cloud credentials and the adaptive controller parameters:
```bash
cat << 'EOF' > .env
# Database & Broker
MONGODB_URL=mongodb+srv://reelbite74_db_user:QVHfxw4chUq1NwJI@cluster0.ed8v9ha.mongodb.net/fooddelivery
REDIS_URL=redis://redis:6379
FRONTEND_PORT=80

# Adaptive Concurrency Parameters
ADAPTIVE_MIN_CONCURRENCY=1
ADAPTIVE_MAX_CONCURRENCY=20
ADAPTIVE_INITIAL_CONCURRENCY=5
ADAPTIVE_MONITOR_INTERVAL_MS=5000
ADAPTIVE_COOLDOWN_MS=15000
ADAPTIVE_CPU_HIGH=80
ADAPTIVE_CPU_LOW=50
ADAPTIVE_MEMORY_HIGH=85
ADAPTIVE_SCALE_UP_STEP=2
ADAPTIVE_SCALE_DOWN_STEP=1
ADAPTIVE_QUEUE_HIGH=3
EOF
```

### Step 3: Build & Launch Production Containers
Launch the core services (`redis`, `backend`, `frontend`):
```bash
docker compose up -d --build
```

### Step 4: Verify Container Health
Check running container states and automated healthchecks:
```bash
docker compose ps
```
Expected output:
```
NAME                IMAGE               COMMAND                  SERVICE    STATUS
reelbite-redis      redis:7-alpine      "docker-entrypoint.s…"   redis      Up (healthy)
reelbite-backend    backend             "node index.js"          backend    Up (healthy)
reelbite-frontend   frontend            "nginx -g 'daemon of…"   frontend   Up
```

---

## 4. Multi-Worker Horizontal Scaling (Optional)

By default, `backend` handles both API traffic and vertical adaptive worker concurrency. If you want to decouple API serving from background workers and run **dedicated background worker pods**, use the `worker` profile:

### Launch 1 Dedicated Worker Pod:
```bash
docker compose --profile worker up -d
```

### Horizontally Scale to Multiple Worker Containers:
```bash
docker compose --profile worker up -d --scale worker=3
```
* **Architecture Distinction:**
  * **Horizontal Scaling:** Launches 3 independent worker container processes across the EC2 instance or cluster.
  * **Vertical Concurrency:** Inside *each* worker process, the Adaptive Controller dynamically adjusts concurrency from 1 to 20 based on local CPU and memory pressure.

---

## 5. Live Verification & Health Endpoints

### 1. Basic Health Check
```bash
curl http://localhost:5000/api/health
# Response: {"status":"ok","db":"connected","uptime":142.5}
```

### 2. BullMQ Event Queue Health
```bash
curl http://localhost:5000/api/queue/stats
# Response: {"queue":"order-events","status":"HEALTHY","redisConnected":true,"metrics":{"waiting":0,"active":0,"completed":45,"failed":0}}
```

### 3. Comprehensive Infrastructure Telemetry
```bash
curl http://localhost:5000/api/admin/infrastructure/metrics
```

---

## 6. Real-Time Observability & Monitoring

### Stream Adaptive Controller Logs
Watch the autonomous controller evaluate workload and make dynamic decisions in real-time:
```bash
docker compose logs -f backend | grep "Adaptive Concurrency"
```

Sample output:
```
⚡ [Adaptive Concurrency] 5 → 7 (+2) | Rule: CASE_1_HIGH_HEADROOM | Reason: Queue backlog surging (20 waiting) while CPU (21.4%) is low.
⚡ [Adaptive Concurrency] 7 → 6 (-1) | Rule: CASE_2_IDLE_DRAIN | Reason: Workload is low/drained (0 waiting). Gradually scaling down concurrency to release resources.
```

### Access Web Monitoring Dashboard
1. Open your browser and navigate to:
   `http://13.127.5.34/admin?tab=infrastructure` (or `http://localhost/admin?tab=infrastructure` locally).
2. Log in with your admin credentials.
3. Observe:
   * Real-time Concurrency Gauge ($1-20$)
   * Queue Backlog & Waiting Latency
   * CPU % and Memory % Utilization Bars
   * Live Decision Audit Log
   * Traffic Burst Simulator buttons ($+10$, $+25$, $+50$)
   * Dead Letter Queue (DLQ) Inspector & Manual Retry

---

## 7. Running Performance Benchmarks On Server

Execute the comparative benchmark suite (Experiment A vs B vs C) inside the running backend container:
```bash
docker compose exec backend node scripts/runExperiments.js
```
The script will run identical 30-job batches and output the comparative analysis table directly into the terminal, persisting results to `backend/data/experimentResults.json`.

---

## 8. Graceful Shutdown & Maintenance

To perform zero-downtime maintenance or restart the application:
```bash
# Gracefully drain background jobs and stop containers
docker compose down

# View resource usage across all containers
docker stats
```
EOF

