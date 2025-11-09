// model/repository.js
import bcrypt from "bcrypt";
import "dotenv/config";
import UserModel from "./user-model.js";
import { connect } from "mongoose";

export async function connectToDB() {
  // sanity: many people invert these; adjust if needed
  const mongoDBUri =
    process.env.ENV === "DEV"
      ? process.env.DB_LOCAL_URI || process.env.DB_CLOUD_URI
      : process.env.DB_CLOUD_URI || process.env.DB_LOCAL_URI;

  if (!mongoDBUri) throw new Error("Missing MongoDB URI in env");
  await connect(mongoDBUri);
}

/* ---------- Utilities ---------- */

export async function isUsernameTaken(username) {
  return !!(await UserModel.findOne({ username: username.toLowerCase().trim() }).select("_id"));
}

export async function ensureUniqueUsername(base) {
  const clean = (base || "user").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
  if (!(await isUsernameTaken(clean))) return clean;
  let i = 1;
  while (await isUsernameTaken(`${clean}${i}`)) i++;
  return `${clean}${i}`;
}

async function hashPassword(plain) {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return bcrypt.hash(plain, rounds);
}

/* ---------- Local (email/password) ---------- */

export async function createLocalUser({
  username,
  fullname,
  email,
  password,
  avatarUrl = "",
  emailVerificationTokenHash,
  emailVerificationExpiresAt,
}) {
  if (!email) throw new Error("Email is required for local signup");
  if (!password) throw new Error("Password is required for local signup");
  const uname = await ensureUniqueUsername(username || email.split("@")[0]);

  const hashed = await hashPassword(password);

  const doc = new UserModel({
    username: uname,
    fullname,
    email: email.toLowerCase().trim(),
    password: hashed,
    avatarUrl,
    isEmailVerified: false,
    emailVerificationTokenHash,
    emailVerificationExpiresAt,
    providers: [{ provider: "password", providerId: `local:${email.toLowerCase()}` }],
  });

  return doc.save();
}

export async function findUserByEmail(email) {
  if (!email) return null;
  return UserModel.findOne({ email: email.toLowerCase().trim() });
}

// If you later set password select:false in the schema, uncomment this version:
// export async function findUserByEmailWithPassword(email) {
//   if (!email) return null;
//   return UserModel.findOne({ email: email.toLowerCase().trim() }).select("+password");
// }

export async function findUserById(userId) {
  return UserModel.findById(userId);
}

export async function findUserByUsername(username) {
  return UserModel.findOne({ username: username.toLowerCase().trim() });
}

export async function findUserByUsernameOrEmail(username, email) {
  const or = [];
  if (username) or.push({ username: username.toLowerCase().trim() });
  if (email) or.push({ email: email.toLowerCase().trim() });
  if (!or.length) return null;
  return UserModel.findOne({ $or: or });
}

export async function findAllUsers() {
  return UserModel.find();
}

export async function updateUserById(userId, { username, fullname, email, password, avatarUrl }) {
  const update = {};
  if (username) update.username = username.toLowerCase().trim();
  if (fullname) update.fullname = fullname;
  if (email) update.email = email.toLowerCase().trim();
  if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;

  if (password) {
    update.password = await hashPassword(password);
  }

  return UserModel.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true }
  );
}

export async function updateUserPrivilegeById(userId, isAdmin) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $set: { isAdmin: !!isAdmin } },
    { new: true }
  );
}

export async function deleteUserById(userId) {
  return UserModel.findByIdAndDelete(userId);
}

export async function findUserByEmailVerificationTokenHash(tokenHash) {
  if (!tokenHash) return null;
  return UserModel.findOne({ emailVerificationTokenHash: tokenHash });
}

export async function markUserEmailVerified(userId) {
  if (!userId) return null;
  return UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
      },
      $unset: {
        emailVerificationTokenHash: "",
        emailVerificationExpiresAt: "",
      },
    },
    { new: true }
  );
}

/* ---------- OAuth (find-or-create) ---------- */

export async function findUserByProviderId(provider, providerId) {
  return UserModel.findOne({
    providers: { $elemMatch: { provider, providerId } },
  });
}

// Creates a user coming from OAuth (email may be null for GitHub)
export async function createOAuthUser({ provider, providerId, username, fullname, email, avatarUrl }) {
  const uname = await ensureUniqueUsername(
    username || (email ? email.split("@")[0] : fullname) || "user"
  );

  const user = new UserModel({
    username: uname,
    fullname: fullname || uname,
    email: email ? email.toLowerCase().trim() : undefined,
    avatarUrl: avatarUrl || "",
    isEmailVerified: true,
    providers: [{ provider, providerId }],
  });

  return user.save();
}

// Link an OAuth provider to an existing user (no duplicates)
export async function linkProvider(userId, provider, providerId) {
  return UserModel.findByIdAndUpdate(
    userId,
    { $addToSet: { providers: { provider, providerId } } },
    { new: true }
  );
}
