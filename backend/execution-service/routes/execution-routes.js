import express from "express";
import { runCode } from "../controller/execution-controller.js";

const router = express.Router();

router.post("/run", runCode);

export default router;
