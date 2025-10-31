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

const router = express.Router();

router.get("/", getAllQuestions);

router.post("/", createQuestion);

router.patch("/id/:id", updateQuestion);

router.get("/id/:id", getQuestion);

router.delete("/id/:id", deleteQuestion);

router.get("/random", getRandomQuestion);

router.post("/uploads/image", upload.single("image"), uploadExampleImage);

export default router;
