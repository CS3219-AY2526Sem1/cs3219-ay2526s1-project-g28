// controller/auth-controller.js
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Use one import name; don't import the same thing twice
import {
  findUserByEmail,              // local login + email lookup for OAuth
  findUserByProviderId,         // OAuth lookup
  createOAuthUser,              // create user for OAuth
  ensureUniqueUsername,         // repo helper we added
  updateUserById,          // keep existing users in sync with provider data
  findUserByPasswordResetTokenHash,
} from "../model/repository.js";

import { formatUserResponse } from "./user-controller.js";
import { buildPasswordResetUrl, sendPasswordResetEmail } from "../services/email-service.js";
import {
  getEnvVar,
  getNumericEnvVar,
  parseOriginsFromEnv,
} from "../utils/env.js";

const FRONTEND_ORIGINS = parseOriginsFromEnv(getEnvVar("FRONTEND_ORIGIN"));

if (FRONTEND_ORIGINS.length === 0) {
  throw new Error(
    "FRONTEND_ORIGIN environment variable is required for OAuth redirects"
  );
}

const FRONTEND_ORIGIN = FRONTEND_ORIGINS[0];
const JWT_SECRET = getEnvVar("JWT_SECRET");
const PASSWORD_RESET_TTL_HOURS = getNumericEnvVar("PASSWORD_RESET_TTL_HOURS", 1);

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

const PASSWORD_RULES = [
  {
    test: (value) => typeof value === "string" && value.length >= 8,
    message: "Password must be at least 8 characters long.",
  },
  {
    test: (value) => typeof value === "string" && /[a-z]/.test(value),
    message: "Password must include a lowercase letter.",
  },
  {
    test: (value) => typeof value === "string" && /[A-Z]/.test(value),
    message: "Password must include an uppercase letter.",
  },
  {
    test: (value) => typeof value === "string" && /\d/.test(value),
    message: "Password must include a number.",
  },
  {
    test: (value) => typeof value === "string" && /[^A-Za-z0-9]/.test(value),
    message: "Password must include a special character.",
  },
];

function validatePasswordStrength(password) {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      return rule.message;
    }
  }
  return null;
}

export async function requestPasswordReset(req, res) {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user || !user.password) {
      return res.status(200).json({
        message: "If an account exists for this email, a reset link has been sent.",
        data: { dispatched: false },
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiration = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 60 * 60 * 1000);

    await updateUserById(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: expiration,
    });

    const resetUrl = buildPasswordResetUrl(token);
    const recipientName = user.fullname || user.username || "there";

    let emailDispatched = false;
    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: recipientName,
        resetUrl,
        expiresAt: expiration,
      });
      emailDispatched = true;
    } catch (err) {
      console.error("Failed to send password reset email", err);
    }

    return res.status(200).json({
      message: emailDispatched
        ? "If an account exists for this email, a reset link has been sent."
        : "We couldn't confirm email delivery, but if an account exists it now has a fresh reset link.",
      data: {
        dispatched: emailDispatched,
        expiresAt: expiration,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when requesting password reset" });
  }
}

export async function resetPassword(req, res) {
  const { token, password } = req.body ?? {};

  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Reset token is required" });
  }

  if (!password || typeof password !== "string") {
    return res.status(400).json({ message: "New password is required" });
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await findUserByPasswordResetTokenHash(tokenHash);

    if (!user || !user.passwordResetExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    const updatedUser = await updateUserById(user.id, {
      password,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });

    return res.status(200).json({
      message: "Password reset successfully",
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when resetting password" });
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
