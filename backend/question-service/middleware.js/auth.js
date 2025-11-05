import fetch from "node-fetch";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3000";

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication failed" });
  }

  try {
    const r = await fetch(`${API_GATEWAY_URL}/auth/verify-token`, {
      method: "GET",
      headers: { Authorization: auth },
    });
    if (!r.ok) return res.status(401).json({ message: "Authentication failed" });

    const payload = await r.json();
    req.user = payload.data;
    if (!req.user) return res.status(401).json({ message: "Authentication failed" });

    next();
  } catch (e) {
    return res.status(401).json({ message: "Authentication failed" });
  }
}

export function adminOnly(req, res, next) {
  return req.user?.isAdmin ? next() : res.status(403).json({ message: "Admins only" });
}