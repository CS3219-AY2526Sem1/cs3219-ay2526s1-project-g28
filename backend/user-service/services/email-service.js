// services/email-service.js
import "dotenv/config";
import { parseOriginsFromEnv } from "../utils/env.js";

const FRONTEND_ORIGINS = parseOriginsFromEnv(process.env.FRONTEND_ORIGIN);

if (FRONTEND_ORIGINS.length === 0) {
  throw new Error(
    "FRONTEND_ORIGIN environment variable is required to build email links"
  );
}

const DEFAULT_ORIGIN = FRONTEND_ORIGINS[0];
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_VERIFICATION_WEBHOOK = process.env.EMAIL_VERIFICATION_WEBHOOK;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const PASSWORD_RESET_WEBHOOK = process.env.PASSWORD_RESET_WEBHOOK;

const EXPIRY_TIMEZONE = "Asia/Singapore";
const EXPIRY_FORMATTER = new Intl.DateTimeFormat("en-SG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: EXPIRY_TIMEZONE,
});

function formatExpiry(date) {
  if (!(date instanceof Date)) return null;
  if (Number.isNaN(date.getTime())) return null;
  return `${EXPIRY_FORMATTER.format(date)} (GMT+8)`;
}

function getFetch() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch API is not available in this runtime");
  }
  return fetch;
}

function resolveBaseUrl() {
  const configured = process.env.EMAIL_VERIFICATION_URL;
  if (!configured) {
    return new URL("/verify-email", DEFAULT_ORIGIN);
  }

  try {
    return new URL(configured);
  } catch (_err) {
    return new URL(configured, DEFAULT_ORIGIN);
  }
}

export function buildVerificationUrl(token) {
  if (!token) throw new Error("Verification token is required");
  const url = resolveBaseUrl();
  url.searchParams.set("token", token);
  return url.toString();
}

function resolvePasswordResetBaseUrl() {
  const configured = process.env.PASSWORD_RESET_URL;
  if (!configured) {
    return new URL("/reset-password", DEFAULT_ORIGIN);
  }

  try {
    return new URL(configured);
  } catch (_err) {
    return new URL(configured, DEFAULT_ORIGIN);
  }
}

export function buildPasswordResetUrl(token) {
  if (!token) throw new Error("Password reset token is required");
  const url = resolvePasswordResetBaseUrl();
  url.searchParams.set("token", token);
  return url.toString();
}

function buildEmailContent({ name, verificationUrl, expiresAt }) {
  const safeName = name || "there";
  const formattedExpiry = expiresAt ? formatExpiry(expiresAt) : null;
  const expirationText = formattedExpiry
    ? `This link will expire on ${formattedExpiry}.`
    : "";

  const plainText = [
    `Hello ${safeName},`,
    "",
    "Please verify your email address by visiting the link below:",
    verificationUrl,
    "",
    expirationText,
    "",
    "If you did not request this, you can safely ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <p>Hello ${safeName},</p>
  <p>Please verify your email address by clicking the button below:</p>
  <p>
    <a href="${verificationUrl}"
       target="_blank"
       rel="noopener noreferrer"
       style="display:inline-block;padding:10px 16px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;">
      Verify email
    </a>
  </p>
  <p>
    Or copy and paste this link into your browser:<br/>
    <a href="${verificationUrl}" target="_blank" rel="noopener noreferrer">${verificationUrl}</a>
  </p>
  ${expirationText ? `<p>${expirationText}</p>` : ""}
  <p>If you did not request this, you can safely ignore this email.</p>
`;


  return { plainText, html };
}

function buildPasswordResetEmailContent({ name, resetUrl, expiresAt }) {
  const safeName = name || "there";
  const formattedExpiry = expiresAt ? formatExpiry(expiresAt) : null;
  const expirationText = formattedExpiry
    ? `This link will expire on ${formattedExpiry}.`
    : "";

  const plainText = [
    `Hello ${safeName},`,
    "",
    "We received a request to reset the password for your account.",
    "If you made this request, reset your password by visiting the link below:",
    resetUrl,
    "",
    expirationText,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
  <p>Hello ${safeName},</p>
  <p>We received a request to reset the password for your account.</p>
  <p>If you made this request, click the button below to choose a new password:</p>
  <p>
    <a href="${resetUrl}"
       target="_blank"
       rel="noopener noreferrer"
       style="display:inline-block;padding:10px 16px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;">
      Reset password
    </a>
  </p>
  <p>
    Or copy and paste this link into your browser:<br/>
    <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a>
  </p>
  ${expirationText ? `<p>${expirationText}</p>` : ""}
  <p>If you did not request a password reset, you can ignore this email.</p>
`;

  return { plainText, html };
}

async function postToWebhook({ to, name, verificationUrl, expiresAt }) {
  const body = {
    to,
    name,
    verificationUrl,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };

  const fetchFn = getFetch();
  const response = await fetchFn(EMAIL_VERIFICATION_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Email webhook responded with status ${response.status}: ${text}`);
  }
}

async function sendViaSendGrid({ to, name, verificationUrl, expiresAt }) {
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    throw new Error("Missing SENDGRID_API_KEY or EMAIL_FROM env variables");
  }

  const { plainText, html } = buildEmailContent({ name, verificationUrl, expiresAt });

  const fetchFn = getFetch();
  const response = await fetchFn("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to, name }],
        },
      ],
      from: { email: EMAIL_FROM },
      subject: "Verify your email address",
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SendGrid responded with status ${response.status}: ${text}`);
  }
}

export async function sendVerificationEmail({ to, name, verificationUrl, expiresAt }) {
  if (!to) throw new Error("Recipient email is required");

  if (EMAIL_VERIFICATION_WEBHOOK) {
    await postToWebhook({ to, name, verificationUrl, expiresAt });
    return;
  }

  if (SENDGRID_API_KEY && EMAIL_FROM) {
    await sendViaSendGrid({ to, name, verificationUrl, expiresAt });
    return;
  }

  console.warn(
    "No email transport configured. Set EMAIL_VERIFICATION_WEBHOOK or SENDGRID_API_KEY/EMAIL_FROM to send verification emails."
  );
  console.info(`Verification link for ${to}: ${verificationUrl}`);
}

async function postPasswordResetWebhook({ to, name, resetUrl, expiresAt }) {
  const body = {
    to,
    name,
    resetUrl,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
  };

  const fetchFn = getFetch();
  const response = await fetchFn(PASSWORD_RESET_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Password reset webhook responded with status ${response.status}: ${text}`);
  }
}

async function sendPasswordResetViaSendGrid({ to, name, resetUrl, expiresAt }) {
  if (!SENDGRID_API_KEY || !EMAIL_FROM) {
    throw new Error("Missing SENDGRID_API_KEY or EMAIL_FROM env variables");
  }

  const { plainText, html } = buildPasswordResetEmailContent({ name, resetUrl, expiresAt });

  const fetchFn = getFetch();
  const response = await fetchFn("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to, name }],
        },
      ],
      from: { email: EMAIL_FROM },
      subject: "Reset your password",
      content: [
        { type: "text/plain", value: plainText },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`SendGrid responded with status ${response.status}: ${text}`);
  }
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresAt }) {
  if (!to) throw new Error("Recipient email is required");

  if (PASSWORD_RESET_WEBHOOK) {
    await postPasswordResetWebhook({ to, name, resetUrl, expiresAt });
    return;
  }

  if (SENDGRID_API_KEY && EMAIL_FROM) {
    await sendPasswordResetViaSendGrid({ to, name, resetUrl, expiresAt });
    return;
  }

  console.warn(
    "No email transport configured. Set PASSWORD_RESET_WEBHOOK or SENDGRID_API_KEY/EMAIL_FROM to send password reset emails."
  );
  console.info(`Password reset link for ${to}: ${resetUrl}`);
}
