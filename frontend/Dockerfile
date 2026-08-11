# ─── Frontend Dockerfile ──────────────────────────────────────────────────────
# React + Vite + TailwindCSS frontend for Reelbite Food Delivery

# ── Stage 1: Build the Vite app ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_FIREBASE_APIKEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_GEOAPIKEY
ARG VITE_RAZORPAY_KEY_ID

ENV VITE_FIREBASE_APIKEY=$VITE_FIREBASE_APIKEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_GEOAPIKEY=$VITE_GEOAPIKEY
ENV VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID

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
