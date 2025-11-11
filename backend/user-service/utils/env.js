const INLINE_COMMENT_PATTERN = /\s+#.*$/;

export function stripInlineComment(value) {
  if (typeof value !== "string") return value;
  return value.replace(INLINE_COMMENT_PATTERN, "").trim();
}

export function getEnvVar(key) {
  const raw = process.env[key];
  if (typeof raw === "undefined") return undefined;
  const cleaned = stripInlineComment(raw);
  return cleaned === "" ? "" : cleaned;
}

export function getEnvVarOrDefault(key, defaultValue) {
  const value = getEnvVar(key);
  return value === undefined || value === "" ? defaultValue : value;
}

export function getNumericEnvVar(key, defaultValue) {
  const value = getEnvVar(key);
  if (value === undefined || value === "") {
    return Number(defaultValue);
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? Number(defaultValue) : parsed;
}

export function parseOriginsFromEnv(value) {
  return stripInlineComment(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
