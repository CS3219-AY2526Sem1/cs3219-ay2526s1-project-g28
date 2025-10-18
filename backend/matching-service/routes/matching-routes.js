import express from "express";
import { startMatchmaking } from "../controller/matching-controller.js";

const router = express.Router();

router.post("/", startMatchmaking);

export default router;
