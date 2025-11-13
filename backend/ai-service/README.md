# AI Service

The AI Service wraps OpenAI's Chat Completions API and exposes two SSE-based endpoints used by the frontend tutoring features.
It is implemented as an Express server with [`openai`](https://www.npmjs.com/package/openai), `cors` and
`express-rate-limit`. See [`server.js`](./server.js) for the implementation.

## Local development

1. Install dependencies: `npm install`
2. Create a `.env` file with the variables below.
3. Start the dev server: `npm run dev` (uses nodemon)
4. Start the production build: `npm start`

The service listens on `AI_SERVICE_PORT` and exposes `GET /health` for readiness checks.

## Environment variables

| Name | Description |
| ---- | ----------- |
| `AI_SERVICE_PORT` | Port for the Express server. |
| `FRONTEND_ORIGIN` | Origin allowed through CORS. Defaults to `http://localhost:5173`. |
| `OPENAI_API_KEY` | API key for OpenAI/OpenRouter. Required. |
| `OPENAI_MODEL` | Optional override for the chat model (defaults to `gpt-4`). |

## Endpoints

| Method & Path | Description |
| ------------- | ----------- |
| `GET /health` | Returns `{ ok: true }` for monitoring. |
| `POST /ai/explain` | Streams natural-language explanations for the submitted code snippet. Requires `{ code, language, problem, selectionRange, chatContext }`. |
| `POST /ai/chat` | Streams a tutoring-style conversation. Requires `{ messages: [{ role, content }], context }`. |

Both POST endpoints respond with Server-Sent Events (`event: chunk`, `event: done`, `event: error`). Remember to keep the HTTP
connection open on the client and parse `data` as JSON.
