// controller/auth-controller.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Use one import name; don't import the same thing twice
import {
  findUserByEmail,              // local login + email lookup for OAuth
  findUserByProviderId,         // OAuth lookup
  createOAuthUser,              // create user for OAuth
  ensureUniqueUsername,         // repo helper we added
} from "../model/repository.js";

import { formatUserResponse } from "./user-controller.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET;

// Small helper so we don’t depend on another utils file
function baseUsername(displayName, email, fallback = "user") {
  const fromEmail = email ? email.split("@")[0] : "";
  const raw = (displayName || fromEmail || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return raw || "user";
}

/* ========== Local email/password login (unchanged) ========== */
export async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing email and/or password" });

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Wrong email and/or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Wrong email and/or password" });

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Email address has not been verified" });
    }

    const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1d" });

    return res.status(200).json({
      message: "User logged in",
      data: { accessToken, ...formatUserResponse(user) },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ========== Optional token verify route (unchanged) ========== */
export async function handleVerifyToken(_req, res) {
  try {
    const verifiedUser = _req.user;
    return res.status(200).json({ message: "Token verified", data: verifiedUser });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ========== Google OAuth callback (find-or-create) ========== */
export const googleCallback = async (req, res) => {
  if (!req.user) return res.status(400).json({ error: "User not found in request" });

  const provider = "google";
  const providerId = req.user.id;
  const displayName = req.user.displayName || "";
  const profilePic  = req.user.photos?.[0]?.value || "";
  const email       = req.user.emails?.[0]?.value || null; // Google emails are verified

  try {
    // 1) Try by provider id
    let user = await findUserByProviderId(provider, providerId);

    // 2) Or by email (if present)
    if (!user && email) {
      const existing = await findUserByEmail(email);
      if (existing) {
        // If you want to link, call linkProvider(existing.id, provider, providerId) here.
        user = existing;
      }
    }

    // 3) Create if not found
    if (!user) {
      const base = baseUsername(displayName, email);
      const username = await ensureUniqueUsername(base);

      user = await createOAuthUser({
        provider,
        providerId,
        username,
        fullname: displayName || username,
        email,                // may be null, schema allows it
        avatarUrl: profilePic,
      });
    }

    // 4) Sign JWT with your app’s user payload
    const payload = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      provider,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    // 5) Redirect back to FE to reuse your existing localStorage flow
    const redirectUrl = new URL("/login/success", FRONTEND_ORIGIN);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("displayName", user.fullname || user.username || "");
    redirectUrl.searchParams.set("profilePic", user.avatarUrl || "");
    redirectUrl.searchParams.set("id", String(user.id));
    redirectUrl.searchParams.set("username", user.username || "");
    redirectUrl.searchParams.set("email", user.email || "");

    return res.redirect(redirectUrl.toString());
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

/* ========== GitHub OAuth callback (find-or-create) ========== */
export const githubCallback = async (req, res) => {
  if (!req.user) return res.status(400).json({ error: "User not found in request" });

  const provider = "github";
  const providerId = req.user.id;
  const ghUsername = req.user.username || "";
  const displayName = req.user.displayName || ghUsername || "";
  const profilePic  = req.user.photos?.[0]?.value || "";

  // Choose a verified (or first) email if available
  const emails = req.user.emails || [];
  const verified = emails.find(e => e.verified) || emails[0];
  const email = verified?.value || null;

  try {
    let user = await findUserByProviderId(provider, providerId);

    if (!user && email) {
      const existing = await findUserByEmail(email);
      if (existing) {
        // Optionally: linkProvider(existing.id, provider, providerId)
        user = existing;
      }
    }

    if (!user) {
      const base = baseUsername(displayName || ghUsername, email);
      const username = await ensureUniqueUsername(base);

      user = await createOAuthUser({
        provider,
        providerId,
        username,
        fullname: displayName || ghUsername || username,
        email, // may be null; schema allows it
        avatarUrl: profilePic,
      });
    }

    const payload = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      provider,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    const redirectUrl = new URL("/login/success", FRONTEND_ORIGIN);
    redirectUrl.searchParams.set("token", token);
    redirectUrl.searchParams.set("displayName", user.fullname || user.username || "");
    redirectUrl.searchParams.set("profilePic", user.avatarUrl || "");
    redirectUrl.searchParams.set("id", String(user.id));
    redirectUrl.searchParams.set("username", user.username || "");
    redirectUrl.searchParams.set("email", user.email || "");

    return res.redirect(redirectUrl.toString());
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
