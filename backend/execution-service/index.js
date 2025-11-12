import express from "express";
import cors from "cors";
import executeRoutes from "./routes/execution-routes.js";
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const FRONTEND =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173" ||
  "http://localhost:5174";
app.use(
  cors({
    origin: [
      FRONTEND,
      "http://localhost:5173",
      "http://127.0.0.1:5174",
      "https://qp8he0nic9.execute-api.ap-southeast-1.amazonaws.com",
    ],
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

app.options("*", cors());

// To handle CORS Errors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // "*" -> Allow all links to access
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Browsers usually send this before PUT or POST Requests
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, PUT, PATCH");
    return res.status(200).json({});
  }

  // Continue Route Processing
  next();
});

app.use("/execute", executeRoutes);
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/", (req, res, next) => {
  console.log("Execution service responding!");
  res.json({
    message: "Hello World from execution-service",
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
