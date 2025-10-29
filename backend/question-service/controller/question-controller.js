import { isValidObjectId } from "mongoose";
import {
  createQuestion as _createQuestion,
  updateQuestionById as _updateQuestionById,
  findQuestionByTitle as _findQuestionByTitle,
  findQuestionById as _findQuestionById,
  findAllQuestions as _findAllQuestions,
  deleteQuestionById as _deleteQuestionById,
  findRandomQuestion as _findRandomQuestion,
} from "../model/repository.js";
import { producer } from "../kafka-utilties.js";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const TOPICS = [
  "Strings",
  "Arrays",
  "Linked List",
  "Heaps",
  "Hashmap",
  "Trees",
  "Graphs",
  "Dynamic Programming",
];

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
      return res.status(404).json({ message: "Question not found" });
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

export async function getQuestion(req, res) {
  try {
    const questionId = req.params.id;
    if (!isValidObjectId(questionId)) {
      return res.status(404).json({ message: `ID ${questionId} is invalid` });
    }

    const question = await _findQuestionById(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ message: `Question ${questionId} not found` });
    } else {
      return res.status(200).json({
        message: `Found question`,
        data: formatQuestionResponse(question),
      });
    }
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Unknown error when getting question!" });
  }
}

export async function getAllQuestions(req, res) {
  try {
    const questions = await _findAllQuestions();

    return res.status(200).json({
      message: `Found ${questions.length} questions`,
      data: questions.map(formatQuestionResponse),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Unknown error when getting all questions!" });
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
      return res
        .status(404)
        .json({ message: `Invalid difficulty level: ${difficulty}` });
    }
    if (topics && !TOPICS.includes(topics)) {
      return res.status(404).json({ message: `Invalid topic: ${topics}` });
    }

    const randomQuestion = await _findRandomQuestion(difficulty, topics);

    if (!randomQuestion || randomQuestion.length === 0) {
      return res
        .status(404)
        .json({ message: "No questions found matching the criteria." });
    }

    return res.status(200).json({
      message: `Found a random question for the difficulty: ${difficulty} and topic: ${topics}`,
      data: formatQuestionResponse(randomQuestion[0]),
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Unknown error when getting a random question!" });
  }
}

export async function deleteQuestion(req, res) {
  try {
    const questionId = req.params.id;
    if (!isValidObjectId(questionId)) {
      return res
        .status(404)
        .json({ message: `Question ${questionId} not found` });
    }
    const question = await _findQuestionById(questionId);
    if (!question) {
      return res
        .status(404)
        .json({ message: `Question ${questionId} not found` });
    }

    await _deleteQuestionById(questionId);
    return res
      .status(200)
      .json({ message: `Deleted question ${questionId} successfully` });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Unknown error when deleting question!" });
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
    testCases: question.testCases,
  };
}

/**
 * This function is a "controller" for Kafka messages.
 * It's triggered by the consumer in kafka.js instead of an HTTP route.
 */
export async function handleMatchingRequest(message) {
  const { correlationId, meta } = message;

  if (!meta.difficulty || !meta.topics) {
    console.warn(
      "Received invalid matching request (missing fields):",
      message
    );
    return;
  }

  console.log(
    `[Question] Kafka: Handling request ${correlationId} for ${meta.difficulty} and topic ${meta.topics[0]}`
  );

  try {
    // 1. Use your existing model function to find a question
    const randomQuestion = await _findRandomQuestion(meta.difficulty, meta.topics[0]);

    if (!randomQuestion || randomQuestion.length === 0) {
      // 2a. Send "Not Found" reply
      console.warn(`[Question] Kafka: No question found for ${correlationId}`);

      await producer.send({
        topic: "question-replies",
        messages: [
          {
            value: JSON.stringify({
              correlationId: correlationId,
              status: "error",
              data: null,
              message: "No questions found matching the criteria.",
            }),
          },
        ],
      });

      return;
    }

    const question = randomQuestion[0];

    // 2b. Send "Success" reply
    await producer.send({
      topic: "question-replies",
      messages: [
        {
          value: JSON.stringify({
            correlationId: correlationId,
            status: "success",
            // Use your existing formatter for a consistent response!
            data: formatQuestionResponse(question),
            message: "Question found successfully.",
          }),
        },
      ],
    });

    console.log(`[Question] Kafka: Sent reply for ${correlationId}`);
  } catch (err) {
    console.error(
      `[Question] Kafka: Error processing request ${correlationId}:`,
      err
    );

    // 3. Send "Error" reply (if possible)
    try {
      await producer.send({
        topic: "question-replies",
        messages: [
          {
            value: JSON.stringify({
              correlationId: correlationId,
              status: "error",
              data: null,
              message: "An internal error occurred in the Question Service.",
            }),
          },
        ],
      });
    } catch (sendErr) {
      console.error(
        `[Question] Kafka: CRITICAL! Failed to send error reply:`,
        sendErr
      );
    }
  }
}
