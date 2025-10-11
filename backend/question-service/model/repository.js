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

export async function createQuestion(title) {
  return new QuestionModel({ title }).save();
}

export async function findQuestionByTitle(title) {
  return QuestionModel.findOne({ title });
}