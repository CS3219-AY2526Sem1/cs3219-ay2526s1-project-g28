import express from "express";
import cors from "cors";
import passport from "./config/passport.js";

import cloudinaryRouter from "./routes/cloudinary-routes.js";
import userRoutes from "./routes/user-routes.js";
import authRoutes from "./routes/auth-routes.js";
import { getEnvVar, parseOriginsFromEnv } from "./utils/env.js";
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(passport.initialize());

const FRONTEND_ORIGINS = parseOriginsFromEnv(getEnvVar("FRONTEND_ORIGIN"));

const corsAllowedOrigins = FRONTEND_ORIGINS.length > 0 ? FRONTEND_ORIGINS : true;

app.use(
  cors({
    origin: corsAllowedOrigins,
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

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
app.use("/api", cloudinaryRouter);

app.get("/", (req, res, next) => {
  console.log("Sending Greetings!");
  res.json({
    message: "Hello World from user-service",
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
