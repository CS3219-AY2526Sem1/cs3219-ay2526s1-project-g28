import express from "express";
import cors from "cors";

import sessionRoutes from "./routes/session-routes.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const FRONTEND =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173" ||
  "http://localhost:5174";
app.use(
  cors({
    origin: [FRONTEND, "http://127.0.0.1:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  })
);

app.use("/collaboration", sessionRoutes);
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/", (req, res, next) => {
  console.log("Collaboration service responding!");
  res.json({
    message: "Hello World from collaboration-service",
  });
});

// Handle When No Route Match Is Found
app.use((req, res, next) => {
  const error = new Error("Route Not Found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message,
    },
  });
});

export default app;
