import { isValidObjectId } from "mongoose";
import {
  createQuestion as _createQuestion,
  findQuestionByTitle as _findQuestionByTitle,
  findQuestionById as _findQuestionById,
  findAllQuestions as _findAllQuestions,
  deleteQuestionById as _deleteQuestionById,
  findRandomQuestion as _findRandomQuestion
} from "../model/repository.js";

const DIFFICULTIES = ["Easy", "Medium", "Hard"]
const TOPICS = ["Strings", "Arrays", "Linked List", "Heaps", "Hashmap", "Trees", "Graphs", "Dynamic Programming"]

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

export async function getQuestion(req, res) {
  try {
    const questionId = req.params.id;
    if (!isValidObjectId(questionId)) {
      return res.status(404).json({ message: `ID ${questionId} is invalid` });
    }

    const question = await _findQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ message: `Question ${questionId} not found` });
    } else {
      return res.status(200).json({ message: `Found question`, data: formatQuestionResponse(question) });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting question!" });
  }
}

export async function getAllQuestions(req, res) {
  try {
    const questions = await _findAllQuestions();

    return res.status(200).json({ message: `Found ${questions.length} questions`, data: questions.map(formatQuestionResponse) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting all questions!" });
  }
}

export async function getRandomQuestion(req, res) {
  try {
    const { difficulty, topics } = req.query;

    if (!difficulty) {
      return res.status(404).json({ message: `Difficulty must be specified` });
    }
    if (!topics) {
      return res.status(404).json({ message: `Topics must be specified` });
    }
    if (difficulty && !DIFFICULTIES.includes(difficulty)) {
      return res.status(404).json({ message: `Invalid difficulty level: ${difficulty}` });
    }
    if (topics && !TOPICS.includes(topics)) {
      return res.status(404).json({ message: `Invalid topic: ${topics}` });
    }

    const randomQuestion = await _findRandomQuestion(difficulty, topics);

    if (!randomQuestion || randomQuestion.length === 0) {
      return res.status(404).json({ message: "No questions found matching the criteria." });
    }

    return res.status(200).json({ 
      message: `Found a random question for the difficulty: ${difficulty} and topic: ${topics}`, 
      data: formatQuestionResponse(randomQuestion[0]) 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting a random question!" });
  }
}

export async function deleteQuestion(req, res) {
  try {
    const questionId = req.params.id;
    if (!isValidObjectId(questionId)) {
      return res.status(404).json({ message: `Question ${questionId} not found` });
    }
    const question = await _findQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ message: `Question ${questionId} not found` });
    }

    await _deleteQuestionById(questionId);
    return res.status(200).json({ message: `Deleted question ${questionId} successfully` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when deleting question!" });
  }
}

export function formatQuestionResponse(question) {
  return {
    id: question.id,
    title: question.title,
    difficulty: question.difficulty,
    topics: question.topics,
    problemStatement: question.problemStatement,
    constraints: question.constraints,
    examples: question.examples,
    codeSnippets: question.codeSnippets,
    testCases: question.testCases
  };
}
