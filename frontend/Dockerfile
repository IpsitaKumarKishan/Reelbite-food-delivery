# ─── Frontend Dockerfile ──────────────────────────────────────────────────────
# React + Vite + TailwindCSS frontend for Reelbite Food Delivery

# ── Stage 1: Build the Vite app ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Copy all source files and build
COPY . .
RUN npm run build

# ── Stage 2: Serve the static build with Nginx ────────────────────────────────
FROM nginx:stable-alpine AS runner

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy the Vite build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config (handles React Router client-side routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
