import { isValidObjectId } from "mongoose";
import {
  createQuestion as _createQuestion,
  updateQuestionById as _updateQuestionById,
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

export async function updateQuestion(req, res) {
  try {
    const { id } = req.params;
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

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

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
    if (existingQuestion && existingQuestion._id.toString() !== id) {
      return res.status(409).json({ message: "Title already exists" });
    }

    // Update question
    const updatedQuestion = await _updateQuestionById(
      id,
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      examples,
      codeSnippets,
      testCases
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found"})
    }

    return res.status(200).json({
      message: `Updated question ${title} successfully`,
      data: formatQuestionResponse(updatedQuestion),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Unknown error when updating question!" });
  }
}

export function formatQuestionResponse(question) {
  return {
    id: question.id,
    title: question.title,
  };
}
