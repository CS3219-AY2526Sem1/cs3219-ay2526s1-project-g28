# API Gateway

The API Gateway is the entrypoint for every HTTP request that the PeerPrep frontend makes. It is a lightweight Express server
that mounts [`http-proxy-middleware`](https://github.com/chimurai/http-proxy-middleware) instances for each downstream
microservice and exposes a single `/health` check. Refer to [`index.js`](./index.js) for the exact proxy wiring.

## Getting started locally

1. Install dependencies: `npm install`
2. Provide the environment variables listed below (create a `.env` file next to `package.json`).
3. Start the development server with hot reload: `npm run dev`
4. Alternatively start in production mode: `npm start`

The gateway defaults to port `3000` and logs every request before forwarding it to the right service.

## Environment variables

| Name | Description |
| ---- | ----------- |
| `GATEWAY_PORT` | Port for the Express server (defaults to `3000`). |
| `USER_SERVICE_URL` | Base URL for `/users`, `/auth` and `/api/cloudinary` routes. |
| `QUESTION_SERVICE_URL` | Base URL for `/questions` routes. |
| `MATCHING_SERVICE_URL` | Base URL for `/matching` routes. |
| `COLLABORATION_SERVICE_URL` | Base URL for `/collaboration` and `/socket.io` routes. |
| `EXECUTION_SERVICE_URL` | Base URL for `/execute` routes. |
| `AI_SERVICE_URL` | Base URL for `/ai` routes. |

All URLs should include the full scheme and port (for example `http://localhost:3001`).

## Proxy map

The table below summarises how the gateway rewrites incoming paths (see the `createProxyMiddleware` calls in
[`index.js`](./index.js)).

| Incoming path | Downstream path |
| ------------- | ---------------- |
| `/users/*` | `/users/*` on the User Service |
| `/auth/*` | `/auth/*` on the User Service |
| `/questions/*` | `/questions/*` on the Question Service |
| `/matching/*` | `/matching/*` on the Matching Service |
| `/collaboration/*` | `/collaboration/*` on the Collaboration Service |
| `/execute/*` | `/execute/*` on the Execution Service |
| `/ai/*` | `/ai/*` on the AI Service |
| `/api/cloudinary/*` | `/api/cloudinary/*` on the User Service |
| `/socket.io/*` | `/socket.io/*` on the Collaboration Service |

Every request is logged with `[Gateway] <METHOD> <URL>` before forwarding so you can debug routing issues quickly.
