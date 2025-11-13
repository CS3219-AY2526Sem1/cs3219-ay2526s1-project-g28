# Question Service

The Question Service stores the full catalogue of coding problems used throughout PeerPrep. It exposes CRUD endpoints for admins,
public read endpoints for the frontend, a Cloudinary-backed upload route for example images, and a Kafka consumer/producer pair
that collaborates with the Matching Service to deliver random questions after two users are paired. The entrypoint is
[`server.js`](./server.js).

## Running locally

1. Install dependencies: `npm install`
2. Start MongoDB and Kafka (or point to managed instances)
3. Create a `.env` file with the variables below
4. Run `npm run dev` for hot reload or `npm start` for production

The HTTP server listens on `QUESTION_SERVICE_PORT` (default `3002`) and exposes `GET /health`.

## Environment variables

| Name | Purpose |
| ---- | ------- |
| `QUESTION_SERVICE_PORT` | Port for Express. |
| `ENV` | `DEV` uses `DB_CLOUD_URI`, anything else uses `DB_LOCAL_URI`. |
| `DB_LOCAL_URI` / `DB_CLOUD_URI` | MongoDB connection strings. |
| `KAFKA_BROKERS` | Comma-separated broker list for Kafka. |
| `KAFKA_USERNAME` / `KAFKA_PASSWORD` | SASL credentials for Kafka. |
| `FRONTEND_ORIGIN` | Allowed origin for CORS in [`index.js`](./index.js). |
| `API_GATEWAY_URL` | Used by `middleware.js/auth.js` to call `/auth/verify-token`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Credentials for example image uploads. |

## REST API

All routes are defined in [`routes/question-routes.js`](./routes/question-routes.js).

| Method & Path | Description | Auth |
| ------------- | ----------- | ---- |
| `GET /questions/` | List every question (with filters handled client side). | Public |
| `POST /questions/` | Create a question with metadata, code snippets and test cases. | `requireAuth`, admin only |
| `PATCH /questions/id/:id` | Update fields on an existing question. | `requireAuth`, admin only |
| `GET /questions/id/:id` | Fetch a single question by Mongo ID. | Public |
| `DELETE /questions/id/:id` | Remove a question. | `requireAuth`, admin only |
| `GET /questions/random?difficulty=&topics=` | Return a random question filtered by difficulty/topics. | Public |
| `POST /questions/uploads/image` | Upload an example image via Cloudinary (`multipart/form-data`). | `requireAuth`, admin only |

Every write operation validates that required fields are provided, that test cases are JSON-serialisable, and that titles are
unique (see [`controller/question-controller.js`](./controller/question-controller.js)).

## Kafka integration

- When both users accept, the Matching Service publishes a `match_found` event that includes `correlationId`, `meta.difficulty`
  and `meta.topics`.
- [`kafka-utilties.js`](./kafka-utilties.js) consumes those events, calls `handleMatchingRequest`, and retrieves a random
  question via `findRandomQuestion`.
- The answer (or an error) is published to the `question-replies` topic so the Matching and Collaboration services can continue
  their workflows.

Use the `correlationId` to trace a specific matchmaking flow across services.
