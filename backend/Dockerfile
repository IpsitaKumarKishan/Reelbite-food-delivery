# ─── Backend Dockerfile ───────────────────────────────────────────────────────
# Node.js / Express / Socket.IO backend for Reelbite Food Delivery

# ── Stage 1: Install production dependencies ──────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
# Install only production dependencies (skip nodemon, etc.)
RUN npm ci --omit=dev

# ── Stage 2: Production runtime image ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# Create a non-root user for security best practices
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Ensure multer's upload directory exists and is owned by the app user
RUN mkdir -p public/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

# Run with node directly in production (nodemon is a dev tool)
CMD ["node", "index.js"]
