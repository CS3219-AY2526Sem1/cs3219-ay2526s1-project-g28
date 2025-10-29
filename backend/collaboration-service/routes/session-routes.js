import express from "express";
import { createSession, endSession } from "../controller/session-controller.js";
const router = express.Router();

router.post("/", createSession);
router.delete("/:sessionId", endSession);

export default router;
