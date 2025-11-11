# services/user/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# App uses port 3001 inside the container
ENV USER_SERVICE_PORT=3001
EXPOSE 3001
# Health check for /health
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["npm", "start"]
