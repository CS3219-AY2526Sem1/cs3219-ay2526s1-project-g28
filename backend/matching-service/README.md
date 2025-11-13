# Matching Service

The Matching Service accepts matchmaking requests, stores queued users in Redis, and coordinates Kafka messages that fetch
questions and notify downstream services when a match is confirmed. The Express app is defined in [`index.js`](./index.js) and
all queue/Kafka logic lives in the `controller`, `model`, `utils` and `kafka-utilties.js` modules.

## Local setup

1. Install dependencies: `npm install`
2. Ensure Redis and Kafka are reachable (Cloud instances work as long as the credentials below are set).
3. Provide the environment variables listed below.
4. Start the service with `npm run dev` or `npm start`.

The HTTP server binds to `PORT` (defaults to `3003`) and exposes `GET /health`.

## Environment variables

| Name | Description |
| ---- | ----------- |
| `PORT` | Port for the Express server. |
| `REDIS_URL` | Connection string for the Redis instance that stores matchmaking queues. |
| `KAFKA_BROKERS` | Comma-separated list of Kafka brokers. |
| `KAFKA_USERNAME` / `KAFKA_PASSWORD` | SASL credentials for Kafka. |

## API surface

| Method & Path | Description |
| ------------- | ----------- |
| `POST /matching/` | Start matchmaking with `{ userId, difficulty, topics[] }`. Returns match info or queue acknowledgement. |
| `DELETE /matching/:userId` | Remove the caller from the queue. |
| `POST /matching/accept` | Accept a pending match `{ userId, matchId }`. |
| `POST /matching/reject` | Reject a pending match `{ userId, matchId }`. |

When both users accept, the repository layer publishes a `match_found` event that is consumed by the Collaboration and Question
services. The matching service also listens for `question-replies` (see `kafka-utilties.js`) so that the randomly selected
question can be forwarded to whichever HTTP request is waiting on the match.
