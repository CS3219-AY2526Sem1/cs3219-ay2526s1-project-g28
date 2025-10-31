// server/routes/cloudinary.js
import express from "express";
import { getUploadSignature } from "../server/cloudinary-signature.js";
import { verifyAccessToken } from "../middleware/basic-access-control.js"; // if you have it

const router = express.Router();

router.get("/cloudinary/sign", verifyAccessToken, (req, res) => {
  // optionally pass ?folder=avatars
  const sig = getUploadSignature({ folder: req.query.folder });
  res.json(sig);
});

export default router;
