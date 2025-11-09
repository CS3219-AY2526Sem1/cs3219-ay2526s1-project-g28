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
import {
  sanitizeExamplesForSave,
  collectImageKeys,
  destroyCloudinaryKeys,
} from "./upload-controller.js";
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

function isJsonSerializable(v) {
  try {
    JSON.stringify(v);
    return true;
  } catch {
    return false;
  }
}

function validateFunctionTestCases(testCases = []) {
  const problems = [];
  if (!Array.isArray(testCases) || testCases.length === 0) {
    problems.push({ index: -1, message: "At least one test case is required." });
    return problems;
  }
  testCases.forEach((tc, idx) => {
    if (!tc || !Array.isArray(tc.args)) {
      problems.push({ index: idx, message: "`args` must be an array." });
      return;
    }
    if (!("expected" in tc)) {
      problems.push({ index: idx, message: "`expected` is required." });
      return;
    }
    if (!isJsonSerializable(tc.args) || !isJsonSerializable(tc.expected)) {
      problems.push({ index: idx, message: "`args` and `expected` must be JSON-serializable." });
    }
    if ("hidden" in tc && typeof tc.hidden !== "boolean") {
      problems.push({
        index: idx,
        message: "`hidden` must be a boolean.",
      });
    }
  });
  return problems;
}

function sanitizeTestCasesForSave(testCases = []) {
  return (Array.isArray(testCases) ? testCases : []).map((tc) => ({
    args: tc.args,
    expected: tc.expected,
    hidden: !!tc.hidden,
  }));
}

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
      entryPoint,
      timeout,
      signature,
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
      entryPoint,
      testCases,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(
        ([_, value]) =>
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
      )
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate examples
    const invalidExamples = (examples || [])
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
    const tcProblems = validateFunctionTestCases(testCases);
    if (tcProblems.length > 0) {
      return res
        .status(400)
        .json({ message: "Invalid test cases", details: tcProblems });
    }

    // Unique title
    const existingQuestion = await _findQuestionByTitle(title);
    if (existingQuestion) {
      return res.status(409).json({ message: "Title already exists" });
    }

    const cleanExamples = sanitizeExamplesForSave(examples);
    const cleanTestCases = sanitizeTestCasesForSave(testCases);

    let timeoutSec = Number(timeout);
    if (Number.isNaN(timeoutSec) || timeoutSec <= 0) {
      timeoutSec = 1;
    }

    // Create new question
    const createdQuestion = await _createQuestion(
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      cleanExamples,
      codeSnippets,
      entryPoint,
      timeoutSec,
      signature,
      cleanTestCases,
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
      entryPoint,
      timeout,
      signature,
      testCases
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid question ID" });
    }

    const current = await _findQuestionById(id);
    if (!current) {
      return res.status(404).json({ message: "Question not found" });
    }

    const requiredFields = {
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      examples,
      entryPoint,
      testCases,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(
        ([_, value]) =>
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
      )
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const invalidExamples = (examples || [])
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

    const tcProblems = validateFunctionTestCases(testCases);
    if (tcProblems.length > 0) {
      return res
        .status(400)
        .json({ message: "Invalid test cases", details: tcProblems });
    }

    const existingQuestion = await _findQuestionByTitle(title);
    if (existingQuestion && existingQuestion._id.toString() !== id) {
      return res.status(409).json({ message: "Title already exists" });
    }

    const cleanExamples = sanitizeExamplesForSave(examples);
    const prevKeys = collectImageKeys(current.examples);
    const newKeys = collectImageKeys(cleanExamples);
    const keysToDelete = prevKeys.filter((k) => !newKeys.includes(k));

    const cleanTestCases = sanitizeTestCasesForSave(testCases);

    let timeoutSec = Number(timeout);
    if (Number.isNaN(timeoutSec) || timeoutSec <= 0) {
      timeoutSec = 1;
    }

    const updatedQuestion = await _updateQuestionById(
      id,
      title,
      difficulty,
      topics,
      problemStatement,
      constraints,
      cleanExamples,
      codeSnippets,
      entryPoint,
      timeoutSec,
      signature,
      cleanTestCases
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    await destroyCloudinaryKeys(keysToDelete);

    return res.status(200).json({
      message: `Updated question ${title} successfully`,
      data: formatQuestionResponse(updatedQuestion),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating question!" });
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
      return res.status(200).json({
        message: `Found question`,
        data: formatQuestionResponse(question),
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting question!" });
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
      data: formatQuestionResponse(randomQuestion[0]),
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

    const keys = collectImageKeys(question.examples);

    await _deleteQuestionById(questionId);

    await destroyCloudinaryKeys(keys);

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
    entryPoint: question.entryPoint,
    timeout: question.timeout,
    signature: question.signature,
    testCases: question.testCases,
  };
}

/**
 * This function is a "controller" for Kafka messages.
 * It's triggered by the consumer in kafka.js instead of an HTTP route.
 */
export async function handleMatchingRequest(message) {
<<<<<<< Updated upstream
=======
  // let request;
  // try {
  //   request = JSON.parse(message.value.toString());
  // } catch (err) {
  //   console.error("Failed to parse Kafka message:", err);
  //   return; // Ignore unparseable message
  // }
  // console.log(request);
  // const { correlationId, difficulty, topics } = request;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======
    // 1. Use your existing model function to find a question
>>>>>>> Stashed changes
    const randomQuestion = await _findRandomQuestion(meta.difficulty, meta.topics[0]);

    if (!randomQuestion || randomQuestion.length === 0) {
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

    await producer.send({
      topic: "question-replies",
      messages: [
        {
          value: JSON.stringify({
            correlationId: correlationId,
            status: "success",
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
