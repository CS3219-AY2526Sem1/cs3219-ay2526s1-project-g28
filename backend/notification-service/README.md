# Notification Service

The Notification Service bridges Redis Pub/Sub events and WebSocket clients. It consumes the `match_events` channel, maps user
IDs to active Socket.IO connections, and emits event payloads back to the browser when match updates occur. Implementation lives
in [`index.js`](./index.js).

## Running locally

1. Install dependencies: `npm install`
2. Provide `REDIS_URL` and (optionally) a custom `NOTIFICATION_SERVICE_PORT` in `.env`.
3. Start the service with `npm run dev` or `npm start`.

The service exposes both an HTTP server (for `GET /health`) and a Socket.IO server on the same port.

## Environment variables

| Name | Description |
| ---- | ----------- |
| `NOTIFICATION_SERVICE_PORT` | Port for Express/Socket.IO (defaults to `3005`). |
| `REDIS_URL` | Redis connection string used for the Pub/Sub subscriber. |

## Event flow

1. Clients connect via Socket.IO and emit `register` with `{ userId }`. The server stores the mapping in memory.
2. Redis subscriber listens to the `match_events` channel.
3. Each incoming message is parsed, the `type` field becomes the Socket.IO event name, and the payload is forwarded to all
   registered users listed under `users` or `userId`.

If a socket disconnects its user mapping is removed automatically.
