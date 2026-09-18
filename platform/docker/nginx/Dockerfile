# ============================================================
# GAMING PLATFORM — NGINX REVERSE PROXY DOCKERFILE
# ============================================================

FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf

# Install curl for health checks
RUN apk add --no-cache curl

# Expose HTTP and HTTPS ports
EXPOSE 80
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
