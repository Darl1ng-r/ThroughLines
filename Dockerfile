# Multi-Stage Production Dockerfile for ThroughLines
#
# Stage 1: Build static web application
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
# Use 'npm ci' for deterministic, reproducible, locked installs (never npm install in CI/CD)
RUN npm ci

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_REDIS_PROXY_URL
ARG VITE_APP_URL
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_REDIS_PROXY_URL=$VITE_REDIS_PROXY_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx Reverse Proxy (Non-Root Unprivileged)
FROM nginx:1.25-alpine AS runner

# Remove default nginx html files
RUN rm -rf /usr/share/nginx/html/*

# Copy built dist bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Setup permissions for unprivileged nginx execution
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /tmp/nginx.pid && \
    chown nginx:nginx /tmp/nginx.pid

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
