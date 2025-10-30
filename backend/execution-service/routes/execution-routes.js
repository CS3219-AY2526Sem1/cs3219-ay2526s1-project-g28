import express from "express";
import { runCode, submitCode } from "../controller/execution-controller.js";

const router = express.Router();

router.post("/run", runCode);
router.post("/submit", submitCode);

export default router;
