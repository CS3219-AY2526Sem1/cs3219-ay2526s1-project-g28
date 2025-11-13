# Execution Service

The Execution Service exposes a single `/execute/run` endpoint that runs user-submitted code against hidden test cases for
JavaScript, Python and Java. The request controller lives in [`routes/execution-routes.js`](./routes/execution-routes.js) and the
language-specific runners are implemented inside [`model/repository.js`](./model/repository.js).

## Running locally

1. Install dependencies: `npm install`
2. Provide the environment variables listed below (the defaults assume local runtimes are on `PATH`).
3. Start the service with `npm run dev` (nodemon) or `npm start`.

The HTTP server listens on `PORT` (defaults to `3006`) and exposes `GET /health`.

## Environment variables

| Name | Description |
| ---- | ----------- |
| `PORT` | Port for the Express server. |
| `FRONTEND_ORIGIN` | Allowed origin for CORS. Include `http://localhost:5173` when testing locally. |
| `PYTHON_BIN` | Optional path/binary name for Python (defaults to `python3` on Unix). |
| `JAVA_BIN` | Optional path to the Java runtime (`java`). |
| `JAVAC_BIN` | Optional path to the Java compiler (`javac`). |

## API

| Method & Path | Description |
| ------------- | ----------- |
| `POST /execute/run` | Body: `{ language, code, input, timeout }`. Returns per-test results (`output`, `result`, `error`). |
| `GET /health` | Returns `{ ok: true }`. |

JavaScript code is sandboxed using Node's `vm` module, Python runs in a temporary file via `spawn`, and Java compiles the
submitted class before running it. Use the `timeout` field (milliseconds) to control per-test execution time.
