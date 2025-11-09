// services/email-service.js
import "dotenv/config";

const DEFAULT_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_VERIFICATION_WEBHOOK = process.env.EMAIL_VERIFICATION_WEBHOOK;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

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

function buildEmailContent({ name, verificationUrl, expiresAt }) {
  const safeName = name || "there";
  const expirationText = expiresAt
    ? `This link will expire on ${expiresAt.toUTCString()}.`
    : "";

  const plainText = [
    `Hello ${safeName},`,
    "",
    "Thanks for signing up. Please verify your email address by visiting the link below:",
    verificationUrl,
    "",
    expirationText,
    "",
    "If you did not sign up, you can safely ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>Hello ${safeName},</p>
    <p>Thanks for signing up. Please verify your email address by clicking the button below:</p>
    <p><a href="${verificationUrl}" style="display:inline-block;padding:10px 16px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:6px;">Verify email</a></p>
    <p>Or copy and paste this link into your browser:<br/><a href="${verificationUrl}">${verificationUrl}</a></p>
    ${expirationText ? `<p>${expirationText}</p>` : ""}
    <p>If you did not sign up, you can safely ignore this email.</p>
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
