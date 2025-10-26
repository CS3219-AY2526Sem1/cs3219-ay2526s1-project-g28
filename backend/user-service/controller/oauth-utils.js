// controller/oauth-utils.js
export function buildUsernameFromDisplayName(displayName, fallback = "user") {
  const base = (displayName || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
  return base;
}

export async function ensureUniqueUsername(base, isTakenFn) {
  // isTakenFn(name) => boolean
  if (!(await isTakenFn(base))) return base;
  let i = 1;
  while (await isTakenFn(`${base}${i}`)) i++;
  return `${base}${i}`;
}
