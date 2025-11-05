import express from "express";
import {
  createQuestion,
  updateQuestion,
  getQuestion,
  getAllQuestions,
  deleteQuestion,
  getRandomQuestion,
} from "../controller/question-controller.js";
import { uploadExampleImage, upload } from "../controller/upload-controller.js"
import { requireAuth, adminOnly } from "../middleware.js/auth.js";

const router = express.Router();

router.get("/", getAllQuestions);

router.post("/", requireAuth, adminOnly, createQuestion);

router.patch("/id/:id", requireAuth, adminOnly, updateQuestion);

router.get("/id/:id", getQuestion);

router.delete("/id/:id", requireAuth, adminOnly, deleteQuestion);

router.get("/random", getRandomQuestion);

router.post("/uploads/image", requireAuth, adminOnly, upload.single("image"), uploadExampleImage);

export default router;
