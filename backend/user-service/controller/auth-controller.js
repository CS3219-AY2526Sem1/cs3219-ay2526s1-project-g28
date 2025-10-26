import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByEmail as _findUserByEmail } from "../model/repository.js";
import { formatUserResponse } from "./user-controller.js";

export async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (email && password) {
    try {
      const user = await _findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Wrong email and/or password" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: "Wrong email and/or password" });
      }
      
      const accessToken = jwt.sign({
        id: user.id,
      }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      return res.status(200).json({ message: "User logged in", data: { accessToken, ...formatUserResponse(user) } });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  } else {
    return res.status(400).json({ message: "Missing email and/or password" });
  }
}

export async function handleVerifyToken(req, res) {
  try {
    const verifiedUser = req.user;
    return res.status(200).json({ message: "Token verified", data: verifiedUser });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

export const googleCallback = (req, res) => {
  if (!req.user) {
    return res.status(400).json({ error: "User not found in request" });
  }

  const payload = {
    id: req.user.id,                    // Unique Google user ID
    username: req.user.emails?.[0]?.value?.split('@')[0] || null, // Extract username from email
    displayName: req.user.displayName,  // Google display name
    profilePic: req.user.photos?.[0]?.value || null, // Profile picture URL
    sessionId: req.sessionID,           // Express session ID
    provider: "google",
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

  // Redirect to frontend with token (include user info if desired)
  const redirectUrl = new URL("http://localhost:3001/login/success");
  redirectUrl.searchParams.set("token", token);
  redirectUrl.searchParams.set("displayName", req.user.displayName);
  redirectUrl.searchParams.set("profilePic", payload.profilePic);

  res.redirect(redirectUrl.toString());
};

export const githubCallback = (req, res) => {
  if (!req.user) {
    return res.status(400).json({ error: "User not found in request" });
  }

  const payload = {
    id: req.user.id,                        // GitHub unique user ID
    username: req.user.username || null,    // GitHub username
    displayName: req.user.displayName || req.user.username, // Display name fallback
    profilePic: req.user.photos?.[0]?.value || null, // GitHub avatar URL
    sessionId: req.sessionID,               // Express session ID
    provider: "github",
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

  // Redirect to frontend with token and basic user info
  const redirectUrl = new URL("http://localhost:3001/login/success");
  redirectUrl.searchParams.set("token", token);
  redirectUrl.searchParams.set("displayName", payload.displayName);
  redirectUrl.searchParams.set("profilePic", payload.profilePic);

  res.redirect(redirectUrl.toString());
};