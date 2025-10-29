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
  isActive: { type: Boolean, default: true },
});

export default mongoose.model("Session", sessionSchema);
