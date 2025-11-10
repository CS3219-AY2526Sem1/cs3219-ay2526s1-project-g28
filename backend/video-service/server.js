import express from "express";
import cors from "cors";
import "dotenv/config";
import { AccessToken } from "livekit-server-sdk";

const app = express();
const port = process.env.VIDEO_SERVICE_PORT || 3010;

const allowedOrigins = (process.env.VIDEO_SERVICE_ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  console.warn(
    "LiveKit configuration is incomplete. Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET."
  );
}

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/token", (req, res) => {
  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return res.status(500).json({
      error: "LiveKit environment variables are not configured on the video service.",
    });
  }

  const roomParam = String(req.query.room || "").trim();
  const identityParam = String(req.query.identity || "").trim();

  if (!roomParam) {
    return res.status(400).json({ error: "Missing room parameter" });
  }

  if (!identityParam) {
    return res.status(400).json({ error: "Missing identity parameter" });
  }

  const sanitizedIdentity = identityParam.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 40);
  const identity = sanitizedIdentity.length > 0 ? sanitizedIdentity : "guest";

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity,
    ttl: 60 * 60, // 1 hour
  });

  token.addGrant({
    roomJoin: true,
    room: roomParam,
    canPublish: true,
    canSubscribe: true,
  });

  return res.json({ token: token.toJwt(), url: livekitUrl });
});

app.use((err, _req, res, _next) => {
  console.error("Unexpected error in video service", err);
  res.status(500).json({ error: "Unexpected error" });
});

app.listen(port, () => {
  console.log(`Video token service listening on port ${port}`);
});
