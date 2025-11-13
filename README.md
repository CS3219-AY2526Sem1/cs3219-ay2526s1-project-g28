# PeerPrep Platform – Monorepo Guide

This repository hosts the PeerPrep application for CS3219 AY2526S1 Group G28. It is organised as a monorepo containing a Vite/React frontend and eight independently deployable backend microservices. This README is the single source of truth for how to set up, run and understand every service in the stack.

## Prerequisites

| Tool | Version | Notes |
| ---- | ------- | ----- |
| Node.js | 18 LTS or newer | Required by every Node-based service and the frontend |
| npm | 10+ | Each package ships with its own `package-lock.json` |
| MongoDB | 7.x | Used by the User, Question and Collaboration services |
| Redis | 7.x | Used by the Matching, Collaboration and Notification services |
| Kafka | Any managed cluster (Confluent, MSK, etc.) | Used by Matching, Question and Collaboration |
| Python, Java | Optional | Only required when enabling their respective language runtimes in Execution Service |

Install dependencies inside each service directory using `npm install` before running the service in development.

## Local development workflow

1. Create a `.env` file at the repository root (or per service) with the environment variables described under each service section below. At minimum provide database URIs, Redis URL, Kafka credentials and the frontend origin.
2. Start the services you need in this order (each command executed inside the service directory):
   ```bash
   # Terminal 1 - API gateway
   cd backend/api-gateway && npm run dev

   # Terminal 2 - Microservice of choice (example: user-service)
   cd backend/user-service && npm run dev

   # Terminal 3 - Frontend
   cd frontend && npm run dev
   ```
3. Visit the frontend (default `http://localhost:5173`). Requests are routed through the API gateway to the corresponding microservices.

> Tip: add `docker-compose.local.yml` (WIP) or your own Docker compose file if you prefer containers. Currently every service exposes a standard `npm run dev` and `npm start` script that you can plug into container images.

## Service catalog

| Service | Folder | Default Port | Purpose |
| ------- | ------ | ------------ | ------- |
| API Gateway | `backend/api-gateway` | `3000` | Routes HTTP traffic to the microservices and exposes `/health`. Uses `http-proxy-middleware` with per-service targets. |
| User Service | `backend/user-service` | `3001` | Authentication, profile and email workflows backed by MongoDB. |
| Question Service | `backend/question-service` | `3002` | CRUD for coding questions, Cloudinary uploads and Kafka publishing. |
| Matching Service | `backend/matching-service` | `3003` | Skill/ difficulty based matching backed by Redis queues and Kafka events. |
| Collaboration Service | `backend/collaboration-service` | `3004` | Real-time sockets, Yjs CRDT rooms and Daily.co video session provisioning. |
| Notification Service | `backend/notification-service` | `3005` | Redis Pub/Sub consumer that pushes socket events (e.g. match updates) to clients. |
| Execution Service | `backend/execution-service` | `3006` | Runs submitted code for JS, Python and Java test cases with sandboxing. |
| AI Service | `backend/ai-service` | _configure via_ `AI_SERVICE_PORT` | Wraps OpenAI APIs to generate explanations and tutor-like chats via SSE. |
| Frontend | `frontend` | `5173` | Vite + React client that consumes all services through the gateway. |

Each service implements a `/health` route that returns `{ ok: true }` for simple readiness probing.

---

## API Gateway (`backend/api-gateway`)

- **Stack:** Express 5, `http-proxy-middleware`, CORS (`package.json`).
- **Key file:** [`index.js`](backend/api-gateway/index.js) – defines proxy mounts for `/users`, `/auth`, `/questions`, `/matching`, `/collaboration`, `/execute`, `/ai`, `/api/cloudinary` and `/socket.io`, plus logging middleware and a 404 handler.
- **Environment:**
  - `GATEWAY_PORT` (default `3000`).
  - `<SERVICE>_URL` targets for every downstream service (`USER_SERVICE_URL`, `QUESTION_SERVICE_URL`, `MATCHING_SERVICE_URL`, `COLLABORATION_SERVICE_URL`, `EXECUTION_SERVICE_URL`, `AI_SERVICE_URL`).
- **Commands:** `npm run dev` (hot reload with nodemon), `npm start` (production).

## User Service (`backend/user-service`)

- **Responsibilities:** registration, login, JWT issuance, password reset, profile management and outbound emails (SendGrid webhooks). MongoDB is configured via `DB_LOCAL_URI`/`DB_CLOUD_URI`, while bcrypt cost is controlled by `BCRYPT_ROUNDS` (`model/repository.js`).
- **Notable middleware:** `middleware/basic-access-control.js` verifies JWTs with `JWT_SECRET` before downstream controllers run.
- **Environment:** `ENV`, `DB_LOCAL_URI`, `DB_CLOUD_URI`, `JWT_SECRET`, `BCRYPT_ROUNDS`, `FRONTEND_ORIGIN`, `EMAIL_FROM`, `SENDGRID_API_KEY`, `EMAIL_VERIFICATION_WEBHOOK`, `PASSWORD_RESET_WEBHOOK` and optional Cloudinary credentials for avatar uploads.
- **Commands:** `npm run dev` / `npm start`.

## Question Service (`backend/question-service`)

- **Responsibilities:** stores coding questions, admin CRUD, filtering endpoints and Cloudinary-based media uploads (`controller/upload-controller.js`). Publishes Kafka events when new questions appear and consumes to stay in sync (`kafka-utilties.js`).
- **Dependencies:** MongoDB connection via `connectToDB` (`server.js`) and Kafka cluster credentials.
- **Environment:**
  - `QUESTION_SERVICE_PORT` (default `3002`).
  - `ENV`, `DB_LOCAL_URI`, `DB_CLOUD_URI`.
  - `KAFKA_BROKERS`, `KAFKA_USERNAME`, `KAFKA_PASSWORD`.
  - `FRONTEND_ORIGIN`, `API_GATEWAY_URL` (used by `middleware/auth.js`).
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Commands:** `npm run dev` / `npm start`.

## Matching Service (`backend/matching-service`)

- **Responsibilities:** receives match requests, writes them into Redis queues (`utils/redisClient.js`) and coordinates Kafka events that notify other services when a match is found (`kafka-utilties.js`).
- **Environment:**
  - `PORT` (default `3003`).
  - `REDIS_URL` for queue storage.
  - `KAFKA_BROKERS`, `KAFKA_USERNAME`, `KAFKA_PASSWORD`.
- **Commands:** `npm run dev` / `npm start`.

## Collaboration Service (`backend/collaboration-service`)

- **Responsibilities:** handles WebSocket editing rooms with Yjs persistence, Socket.IO messaging, and Daily.co video sessions (`controller/session-controller.js`). Subscribes/publishes to Kafka, stores collaboration data in MongoDB, and shares Redis state for room presence.
- **Runtime composition:** HTTP server + Socket.IO server + Yjs websocket server defined in [`server.js`](backend/collaboration-service/server.js).
- **Environment:**
  - `COLLABORATION_SERVICE_PORT`.
  - `REDIS_URL`.
  - `ENV`, `DB_LOCAL_URI`, `DB_CLOUD_URI`.
  - `KAFKA_BROKERS`, `KAFKA_USERNAME`, `KAFKA_PASSWORD`.
  - `DAILY_API_KEY`, `DAILY_API_URL` for video rooms.
- **Commands:** `npm run dev` / `npm start` (optionally pair with `concurrently` if you also run Yjs worker separately).

## Notification Service (`backend/notification-service`)

- **Responsibilities:** consumes Redis Pub/Sub channel `match_events` and forwards payloads to connected Socket.IO clients (`index.js`). Maps user IDs to socket IDs when clients emit `register` events.
- **Environment:** `NOTIFICATION_SERVICE_PORT` (default `3005`), `REDIS_URL`.
- **Commands:** `npm run dev` / `npm start`.

## Execution Service (`backend/execution-service`)

- **Responsibilities:** exposes `/execute/run` (`routes/execution-routes.js`) to run submitted code against hidden test cases (`controller/execution-controller.js`). The repository layer (`model/repository.js`) currently supports JavaScript (via Node `vm`), Python (spawns interpreter) and Java (compiles/runs using `javac`/`java`).
- **Environment:** `PORT` (`3006` default), `FRONTEND_ORIGIN`, optional `PYTHON_BIN`, `JAVA_BIN`, `JAVAC_BIN` overrides.
- **Commands:** `npm run dev` / `npm start`.

## AI Service (`backend/ai-service`)

- **Responsibilities:** wraps OpenAI Chat Completions for `/ai/explain` and `/ai/chat`, streaming Server-Sent Events back to the client (`server.js`). Includes rate limiting and strict CORS allowlist.
- **Environment:** `AI_SERVICE_PORT`, `FRONTEND_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL`.
- **Commands:** `npm run dev` / `npm start`.

## Frontend (`frontend`)

- **Stack:** Vite + React + TypeScript, Tailwind/UnoCSS (see `components.json`) and shadcn UI components.
- **Development:**
  ```bash
  cd frontend
  npm install
  npm run dev -- --host
  ```
  The dev server listens on `http://localhost:5173` and proxies API calls to the gateway configured via `VITE_API_BASE_URL` inside `.env`.
- **Build:** `npm run build` outputs static assets to `dist/`, deployable to CloudFront using `cloudfront-config.json`/`policy.json`.

---

## Health checks & testing

- Every service exposes `GET /health` returning `{ ok: true }` (see for example `backend/api-gateway/index.js`, `backend/ai-service/server.js`, `backend/execution-service/index.js`, etc.) which you can probe using curl or Docker health checks.
- There are no automated unit tests yet. Add them per service using your preferred runner (Vitest/Jest) and update this README when done.

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| Proxy returns 404 | Ensure the API Gateway `process.env.*_SERVICE_URL` variables include the full origin (e.g. `http://localhost:3002`). |
| CORS errors | Check each service’s `FRONTEND_ORIGIN` or hard-coded origins inside the Express `cors` configuration. |
| Kafka or Redis connection fails | Verify secrets and network reachability. Services log connection attempts before starting their HTTP servers (`server.js` in Question/Matching/Collaboration). |
| Execution timeouts | Increase `timeout` in the `/execute/run` payload or ensure `PYTHON_BIN` / `JAVA_BIN` point to installed runtimes. |

## Contributing

1. Create a feature branch.
2. Update the relevant service README section here when you touch configuration or ports.
3. Run `npm run lint` / `npm test` when available.
4. Commit with a descriptive message and open a PR summarising the affected services.
