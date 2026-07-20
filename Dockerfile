# Multi-Stage Enterprise Production Dockerfile for ThroughLines

# Stage 1: Build static web application
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies with legacy peer deps
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Serve via Nginx WAF Reverse Proxy
FROM nginx:1.25-alpine AS runner

# Remove default nginx html files
RUN rm -rf /usr_share_nginx_html/* /usr/share/nginx/html/*

# Copy built dist bundle from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy production Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
