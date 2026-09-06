# Multi-Stage Production Dockerfile for ThroughLines
#
# Stage 1: Build static web application
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_REDIS_PROXY_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_REDIS_PROXY_URL=$VITE_REDIS_PROXY_URL

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx Reverse Proxy
FROM nginx:1.25-alpine AS runner

# Remove default nginx html files
RUN rm -rf /usr/share/nginx/html/*

# Copy built dist bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
