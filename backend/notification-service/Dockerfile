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
# App uses port 3005 inside the container
ENV PORT=3005
EXPOSE 3005
# Health check for /health
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:3005/health || exit 1
CMD ["npm", "start"]
