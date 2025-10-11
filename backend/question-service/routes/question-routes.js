import express from "express";

import {
  createQuestion,
} from "../controller/question-controller.js";

const router = express.Router();

// router.get("/", verifyAccessToken, verifyIsAdmin, getAllUsers);

// router.patch("/:id/privilege", verifyAccessToken, verifyIsAdmin, updateUserPrivilege);

router.post("/", createQuestion);

// router.get("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, getUser);

// router.patch("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, updateUser);

// router.delete("/:id", verifyAccessToken, verifyIsOwnerOrAdmin, deleteUser);

export default router;
