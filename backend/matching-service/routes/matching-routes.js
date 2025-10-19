import express from "express";
import {
  startMatchmaking,
  cancelMatching,
  acceptMatching,
  rejectMatching,
} from "../controller/matching-controller.js";

const router = express.Router();

router.post("/", startMatchmaking);

router.post("/accept", acceptMatching);

router.delete("/:userId", cancelMatching);

router.post("/reject", rejectMatching);

export default router;
