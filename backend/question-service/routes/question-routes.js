import express from "express";

import {
  createQuestion,
  updateQuestion,
  getQuestion,
  getAllQuestions,
  deleteQuestion,
  getRandomQuestion
} from "../controller/question-controller.js";

const router = express.Router();

router.get("/", getAllQuestions);

router.post("/", createQuestion);

router.patch("/:id", updateQuestion);

router.get("/id/:id", getQuestion);

router.delete("/id/:id", deleteQuestion);

router.get("/random", getRandomQuestion);

export default router;
