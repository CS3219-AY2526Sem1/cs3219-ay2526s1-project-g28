import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";
import { startServer } from "./server.js";

const port = Number(process.env.PORT || 3001);
const forwardUrl = new URL(`http://127.0.0.1:${port}`);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function buildQueryString(event) {
  if (event?.rawQueryString) return event.rawQueryString;

  const params = new URLSearchParams();

  const appendEntries = (entries) => {
    for (const [key, value] of Object.entries(entries || {})) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) params.append(key, `${item}`);
        }
      } else {
        params.append(key, `${value}`);
      }
    }
  };

  if (event?.multiValueQueryStringParameters) {
    appendEntries(event.multiValueQueryStringParameters);
  } else if (event?.queryStringParameters) {
    appendEntries(event.queryStringParameters);
  }

  return params.toString();
}

function normaliseHeaders(headers) {
  const normalised = {};
  if (!headers) return normalised;

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    normalised[key.toLowerCase()] = Array.isArray(value) ? value.join(",") : `${value}`;
  }

  return normalised;
}

function getRequestHeaders(event) {
  const headers = normaliseHeaders(event?.headers);
  if (event?.cookies && !headers.cookie) {
    headers.cookie = event.cookies.filter(Boolean).join("; ");
  }

  headers.host = forwardUrl.host;
  headers["x-forwarded-port"] = `${forwardUrl.port}`;

  const proto = event?.requestContext?.http?.protocol || event?.requestContext?.protocol;
  if (proto) {
    headers["x-forwarded-proto"] = proto.split("/")[0].toLowerCase();
  }

  const sourceIp =
    event?.requestContext?.http?.sourceIp || event?.requestContext?.identity?.sourceIp;
  if (sourceIp) {
    headers["x-forwarded-for"] = sourceIp;
  }

  return headers;
}

function getRequestBody(event) {
  if (!event?.body) return null;
  const payload = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body);
  return payload;
}

function shouldEncodeAsBinary(contentType) {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  const textLike = [
    "text/",
    "application/json",
    "application/javascript",
    "application/xml",
    "application/problem+json",
    "application/x-www-form-urlencoded",
  ];

  return !textLike.some((fragment) =>
    lower.startsWith(fragment) || lower.includes(fragment)
  );
}

function sanitiseResponseHeaders(headers) {
  const singleValueHeaders = {};
  const multiValueHeaders = {};
  const cookies = [];

  for (const [key, value] of Object.entries(headers)) {
    if (!value && value !== "") continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) continue;

    if (lower === "set-cookie") {
      if (Array.isArray(value)) {
        cookies.push(...value);
      } else {
        cookies.push(`${value}`);
      }
      continue;
    }

    if (Array.isArray(value)) {
      multiValueHeaders[key] = value.map((entry) => `${entry}`);
    } else {
      singleValueHeaders[key] = `${value}`;
    }
  }

  return { singleValueHeaders, multiValueHeaders, cookies };
}

function forwardToLocalServer({ method, path, queryString, headers, body }) {
  const targetUrl = new URL(path + (queryString ? `?${queryString}` : ""), forwardUrl);

  const filteredHeaders = Object.fromEntries(
    Object.entries(headers).filter(([key]) => !HOP_BY_HOP_HEADERS.has(key))
  );

  if (body && body.length) {
    filteredHeaders["content-length"] = `${body.length}`;
  } else {
    delete filteredHeaders["content-length"];
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      targetUrl,
      {
        method,
        headers: filteredHeaders,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers["content-type"];
          const isBinary = shouldEncodeAsBinary(Array.isArray(contentType) ? contentType[0] : contentType);
          const bodyString = isBinary ? buffer.toString("base64") : buffer.toString("utf8");

          const { singleValueHeaders, multiValueHeaders, cookies } = sanitiseResponseHeaders(
            res.headers
          );

          resolve({
            statusCode: res.statusCode ?? 500,
            headers: singleValueHeaders,
            multiValueHeaders: Object.keys(multiValueHeaders).length ? multiValueHeaders : undefined,
            cookies: cookies.length ? cookies : undefined,
            body: bodyString,
            isBase64Encoded: isBinary,
          });
        });
      }
    );

    req.on("error", reject);

    if (body && body.length) {
      req.write(body);
    }

    req.end();
  });
}

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await startServer();

  const method = event?.requestContext?.http?.method || event?.httpMethod || "GET";
  const path = event?.rawPath || event?.path || "/";
  const queryString = buildQueryString(event);
  const headers = getRequestHeaders(event);
  const body = getRequestBody(event);

  try {
    return await forwardToLocalServer({ method, path, queryString, headers, body });
  } catch (error) {
    console.error("Failed to proxy request to local server", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
