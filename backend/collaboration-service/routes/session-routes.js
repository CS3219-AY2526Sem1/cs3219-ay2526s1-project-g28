import express from "express";
import { createSession, endSession, getSession, createOrGetDailyRoom, closeDailyRoom } from "../controller/session-controller.js";
const router = express.Router();

router.post("/", createSession);
router.delete("/:correlationId", endSession);
router.get("/:correlationId", getSession);
router.post("/create-daily-room/:sessionId", createOrGetDailyRoom);
router.delete("/close-daily-room/:roomName", closeDailyRoom);

export default router;
