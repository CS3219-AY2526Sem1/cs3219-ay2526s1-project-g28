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
ENV PORT=5173
EXPOSE 5173
CMD ["npm", "start"]
