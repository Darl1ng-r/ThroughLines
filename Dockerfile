# Multi-Stage Production Dockerfile for ThroughLines
#
# Stage 1: Build static web application
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx WAF Reverse Proxy
FROM nginx:1.25-alpine AS runner

# Install gettext (provides envsubst) for runtime token injection
RUN apk add --no-cache gettext

# Remove default nginx html files
RUN rm -rf /usr/share/nginx/html/*

# Copy built dist bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config template (contains __UPSTASH_TOKEN__ placeholder)
COPY nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

# At container startup: substitute __UPSTASH_TOKEN__ with the runtime secret
# then launch nginx. The secret is passed via Docker -e flag or Kubernetes secret.
# Example: docker run -e UPSTASH_REDIS_REST_TOKEN=your_token_here ...
CMD ["/bin/sh", "-c", \
    "envsubst '__UPSTASH_TOKEN__' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
     nginx -g 'daemon off;'"]
