export function parseOriginsFromEnv(value) {
  return (value ?? "")
    .split(",")
    .map((entry) => {
      const withoutComment = entry.split("#")[0];
      return withoutComment.trim();
    })
    .filter(Boolean);
}
