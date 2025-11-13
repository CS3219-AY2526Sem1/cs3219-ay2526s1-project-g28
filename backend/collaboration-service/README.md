# Collaboration Service

The Collaboration Service coordinates everything that happens after two users are matched: it stores collaborative sessions,
provisions Daily.co video rooms, exposes REST endpoints under `/collaboration`, and runs both a Socket.IO server and a Yjs WebSocket server for CRDT syncing. The entrypoint is [`server.js`](./server.js) which boots Express, Socket.IO, Redis, MongoDB and Kafka.

## Features

- REST API in [`routes/session-routes.js`](./routes/session-routes.js) for creating, ending and querying sessions as well as
  managing Daily rooms and fetching collaboration history.
- Socket.IO gateway defined in [`sockets/collaboration-socket.js`](./sockets/collaboration-socket.js) for real-time code editor
  and presence events.
- Yjs server (`yjs-server.js`) for shared text state.
- Kafka consumer/producer (`kafka-utilties.js`) that reacts to `match_found` and `question-replies` events.
- MongoDB persistence via [`model/repository.js`](./model/repository.js).

## Local development

1. Install dependencies: `npm install`
2. Start MongoDB, Redis and Kafka, or point to your managed instances.
3. Configure the environment variables shown below.
4. Run `npm run dev` for hot reload or `npm start` for production.

The HTTP server listens on `COLLABORATION_SERVICE_PORT` (default `3004`) and exposes `GET /health`, while Socket.IO and Yjs share
the same port (Yjs is mounted at `ws://<host>:<port>/yjs`).

## Environment variables

| Name | Purpose |
| ---- | ------- |
| `COLLABORATION_SERVICE_PORT` | Port for Express/Socket.IO/Yjs. |
| `ENV` | `DEV` uses `DB_CLOUD_URI`, anything else uses `DB_LOCAL_URI`. |
| `DB_LOCAL_URI` / `DB_CLOUD_URI` | MongoDB connection strings. |
| `REDIS_URL` | Backing store for socket presence and room state. |
| `KAFKA_BROKERS` | Comma-separated list of Kafka brokers. |
| `KAFKA_USERNAME` / `KAFKA_PASSWORD` | SASL credentials for Kafka. |
| `DAILY_API_KEY` | Daily.co API token for room provisioning. |
| `DAILY_API_URL` | Optional override for the Daily REST endpoint. |

## Key routes

| Method & Path | Description |
| ------------- | ----------- |
| `POST /collaboration/` | Create a new collaboration session document. |
| `DELETE /collaboration/:correlationId` | Mark a session as ended. |
| `GET /collaboration/:correlationId` | Fetch session metadata (used by the frontend when resuming). |
| `POST /collaboration/create-daily-room/:sessionId` | Create or fetch a Daily room for the session. |
| `DELETE /collaboration/close-daily-room/:roomName` | Clean up a Daily room. |
| `GET /collaboration/history/:username` | Return the recent sessions for a user (used by the history view). |

Socket.IO clients should emit a registration event as defined in `initCollaborationSocket`, while Yjs clients connect to
`/yjs` using the `correlationId` as the room identifier.
