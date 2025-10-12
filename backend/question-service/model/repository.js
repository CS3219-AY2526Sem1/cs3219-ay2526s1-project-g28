import QuestionModel from "./question-model.js";
import "dotenv/config";
import { connect } from "mongoose";

export async function connectToDB() {
  let mongoDBUri =
    process.env.ENV === "DEV"
      ? process.env.DB_CLOUD_URI
      : process.env.DB_LOCAL_URI;

  await connect(mongoDBUri);
}

export async function createQuestion(
  title,
  difficulty,
  topics,
  problemStatement,
  constraints,
  examples,
  codeSnippets,
  testCases
) {
  return new QuestionModel({
    title,
    difficulty,
    topics,
    problemStatement,
    constraints,
    examples,
    codeSnippets,
    testCases,
  }).save();
}

export async function updateQuestionById(
  questionId, 
  title,
  difficulty,
  topics,
  problemStatement,
  constraints,
  examples,
  codeSnippets,
  testCases
) {
  return QuestionModel.findByIdAndUpdate(
    questionId,
    {
      $set: {
        title,
        difficulty,
        topics,
        problemStatement,
        constraints,
        examples,
        codeSnippets,
        testCases,
      },
    },
    { 
      new: true, // return the updated question
      runValidators: true,
    },  
  );
}

export async function findQuestionByTitle(title) {
  return QuestionModel.findOne({ title });
}

export async function findAllQuestions() {
  return QuestionModel.find();
}

export async function findQuestionById(questionId) {
  return QuestionModel.findById(questionId);
}

export async function findRandomQuestion(difficulty, topics) {
  const matchingCritera = {
    "difficulty": difficulty,
    "topics" : topics
  }

  return QuestionModel.aggregate([
    { $match: matchingCritera },
    { $sample: {size: 1} }
  ]);
}

export async function deleteQuestionById(questionId) {
  return QuestionModel.findByIdAndDelete(questionId);
}
