import express from "express";
import { createSession, endSession, getSession } from "../controller/session-controller.js";
const router = express.Router();

router.post("/", createSession);
router.delete("/:correlationId", endSession);
router.get("/:correlationId", getSession);

export default router;
