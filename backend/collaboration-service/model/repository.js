import mongoose from "mongoose";
import Session from "./session-model.js";

export async function connectToDB() {
  try {
    const mongoDBUri =
      process.env.ENV === "DEV"
        ? process.env.DB_CLOUD_URI
        : process.env.DB_LOCAL_URI;

    await mongoose.connect(mongoDBUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("[MongoDB] Connected to:", mongoDBUri);
  } catch (error) {
    console.error("[MongoDB] Connection error:", error);
    throw error; // rethrow so server.js can handle failure
  }
}

export async function findSessionsByUsername(username) {
  if (!username) return [];
  return Session.find({
    $or: [
      { "users.username": username },
      { "users.id": username },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
}
