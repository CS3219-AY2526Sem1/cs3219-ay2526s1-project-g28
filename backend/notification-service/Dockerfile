# backend/notification-service/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Default CI port for the optional health server
ENV PORT=3005

# If your service exposes /health (either natively or via the tiny health server below),
# this will mark the container healthy. (wget is in BusyBox on alpine)
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3005/health || exit 1

# IMPORTANT: run index.js, not server.js
CMD ["node", "index.js"]
