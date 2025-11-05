import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const port = process.env.GATEWAY_PORT || 3000;

const app = express();
app.use(cors("*"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, PATCH");
    return res.status(200).json({});
  }

  next();
});

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
  "/auth",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/auth${path}`,
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

app.use(
  "/collaboration",
  createProxyMiddleware({
    target: process.env.COLLABORATION_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/collaboration${path}`,
  })
);

// app.use(
//   "/notification",
//   createProxyMiddleware({
//     target: process.env.COLLABORATION_SERVICE_URL,
//     changeOrigin: true,
//     logLevel: "debug",
//     pathRewrite: (path) => `/notification${path}`,
//   })
// );

app.use(
  "/execute",
  createProxyMiddleware({
    target: process.env.EXECUTION_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/execute${path}`,
  })
);

app.use(
  "/ai",
  createProxyMiddleware({
    target: process.env.AI_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/ai${path}`,
  })
);

app.use(
  "/api/cloudinary",
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/api/cloudinary${path}`,
  })
);

app.use(
  "/socket.io",
  createProxyMiddleware({
    target: process.env.COLLABORATION_SERVICE_URL,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: (path) => `/socket.io${path}`,
  })
);

app.use((req, res) => {
  res.status(404).json({ error: { message: "Route Not Found" } });
});

app.listen(port, () => {
  console.log(`API Gateway running on http://localhost:${port}`);
});
