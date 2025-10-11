import { isValidObjectId } from "mongoose";
import {
  createQuestion as _createQuestion,
  findQuestionByTitle as _findQuestionByTitle,
} from "../model/repository.js";

export async function createQuestion(req, res) {
  try {
    const { title } = req.body;
    if (title) {
      const existingQuestion = await _findQuestionByTitle(title);
      if (existingQuestion) {
        return res.status(409).json({ message: "title already exists" });
      }

      const createdQuestion = await _createQuestion(title);
      return res.status(201).json({
        message: `Created new question ${title} successfully`,
        data: formatQuestionResponse(createdQuestion),
      });
    } else {
      return res.status(400).json({ message: "title is missing" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when creating new question!" });
  }
}

export function formatQuestionResponse(question) {
  return {
    id: question.id,
    title: question.title,
  };
}
