// models/user-model.js
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ProviderSubSchema = new Schema(
  {
    provider: { type: String, enum: ["password", "google", "github"], required: true },
    providerId: { type: String, required: true }, // google id / github id / "local:<email>" etc.
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserModelSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  fullname: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,        // allows null/undefined while keeping uniqueness when present
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,        // not required here; enforce in repo for local signups
  },
  avatarUrl: { type: String, default: "" },

  providers: {
    type: [ProviderSubSchema],
    default: [],         // e.g., [{ provider:"password", providerId:"local:user@example.com" }]
  },

  isAdmin: {
    type: Boolean,
    default: false,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Unique (provider, providerId) across collection (sparse to allow no providers)
UserModelSchema.index(
  { "providers.provider": 1, "providers.providerId": 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("UserModel", UserModelSchema);
