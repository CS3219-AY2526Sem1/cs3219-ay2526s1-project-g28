FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of your code
COPY . .

# Set port (change if this service uses a different one)
ENV PORT=3005
EXPOSE 3005

# Optional health check (change to your port if different)
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

# Start the app
CMD ["node", "index.js"]
