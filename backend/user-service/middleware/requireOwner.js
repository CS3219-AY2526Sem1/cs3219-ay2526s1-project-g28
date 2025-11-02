// middleware/requireOwner.js
export function requireOwner(req, res, next) {
  const requesterId = req.user?.id; // set by your verifyAccessToken middleware
  if (!requesterId) return res.status(401).json({ message: "Unauthorized" });
  if (String(requesterId) !== String(req.params.id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}
