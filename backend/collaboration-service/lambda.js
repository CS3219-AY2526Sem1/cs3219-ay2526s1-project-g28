// lambda.js
import serverless from "serverless-http";
import app from "./index.js";
import { connectToDB } from "./model/repository.js";

let isConnected = false; // avoid reconnecting every invocation

async function ensureDB() {
  if (!isConnected) {
    try {
      await connectToDB();
      isConnected = true;
      console.log("✅ MongoDB connected (Lambda cold start)");
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err);
    }
  }
}

export const handler = async (event, context) => {
  await ensureDB();
  const expressHandler = serverless(app);
  return expressHandler(event, context);
};
