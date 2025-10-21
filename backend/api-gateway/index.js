import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(
  "/users",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/users${path}`,
  })
);

app.use(
  "/questions",
  createProxyMiddleware({
    target: process.env.QUESTION_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/questions${path}`,
  })
);

app.use(
  "/matching",
  createProxyMiddleware({
    target: process.env.MATCHING_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/matching${path}`,
  })
);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route Not Found" } });
});

const port = process.env.GATEWAY_PORT || 3000;
app.listen(port, () => {
  console.log(`API Gateway running on http://localhost:${port}`);
});
