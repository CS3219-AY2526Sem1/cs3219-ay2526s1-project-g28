import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  correlationId: { type: String, unique: true, required: true },
  users: [
    {
      id: String,
      username: String,
    },
  ],
  matchKey: { type: String },
  meta: { type: Object },
  question: { type: Object },
  status: { type: String, default: "PENDING_QUESTION" },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date },
  endedAt: { type: Date },
  isActive: { type: Boolean, default: true },
  code: { type: String },
  submitResults: { type: Array },
  error: { type: String },
  language: { type: String },
  hasSubmitted: { type: Boolean },
});

export default mongoose.model("Session", sessionSchema);
