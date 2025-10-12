import { isValidObjectId } from "mongoose";
import {
  createQuestion as _createQuestion,
  findQuestionByTitle as _findQuestionByTitle,
} from "../model/repository.js";

export async function createQuestion(req, res) {
  try {
    const {
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      examples,
      codeSnippets,
      testCases,
    } = req.body;

    // Collect missing fields
    const requiredFields = {
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      examples,
      testCases,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => value === undefined || value === null)
      .map(([key, _]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate examples
    const invalidExamples = examples
      .map((ex, idx) => {
        const missing = [];
        if (!ex.input || ex.input.trim() === "") missing.push("input");
        if (!ex.output || ex.output.trim() === "") missing.push("output");
        return missing.length > 0 ? { index: idx, missing } : true;
      })
      .filter((x) => x !== true);

    if (invalidExamples.length > 0) {
      return res
        .status(400)
        .json({ message: "Invalid examples", details: invalidExamples });
    }

    // Validate test cases
    const invalidTestCases = testCases
      .map((tc, idx) => {
        const missing = [];
        if (!tc.input || tc.input.trim() === "") missing.push("input");
        if (!tc.expected || tc.expected.trim() === "") missing.push("expected");
        return missing.length > 0 ? { index: idx, missing } : true;
      })
      .filter((x) => x !== true);

    if (invalidTestCases.length > 0) {
      return res
        .status(400)
        .json({ message: "Invalid test cases", details: invalidTestCases });
    }

    // Check if question already exists
    const existingQuestion = await _findQuestionByTitle(title);
    if (existingQuestion) {
      return res.status(409).json({ message: "Title already exists" });
    }

    // Create new question
    const createdQuestion = await _createQuestion(
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      examples,
      codeSnippets,
      testCases
    );
    return res.status(201).json({
      message: `Created new question ${title} successfully`,
      data: formatQuestionResponse(createdQuestion),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Unknown error when creating new question!" });
  }
}

export function formatQuestionResponse(question) {
  return {
    id: question.id,
    title: question.title,
  };
}
