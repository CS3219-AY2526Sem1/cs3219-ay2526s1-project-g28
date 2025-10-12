import express from "express";

import {
  createQuestion,
  getQuestion,
  getAllQuestions,
  deleteQuestion,
  getRandomQuestion
} from "../controller/question-controller.js";

const router = express.Router();

router.get("/", getAllQuestions);

// router.patch("/:id/privilege", verifyAccessToken, verifyIsAdmin, updateUserPrivilege);

router.post("/", createQuestion);

router.get("/id/:id", getQuestion);

// router.patch("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, updateUser);

router.delete("/id/:id", deleteQuestion);

router.get("/random", getRandomQuestion);

export default router;
