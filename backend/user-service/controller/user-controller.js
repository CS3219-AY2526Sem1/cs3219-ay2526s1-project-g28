// controller/user-controller.js
import { isValidObjectId } from "mongoose";
import {
  createLocalUser as _createLocalUser,
  deleteUserById as _deleteUserById,
  findAllUsers as _findAllUsers,
  findUserByEmail as _findUserByEmail,
  findUserById as _findUserById,
  findUserByUsername as _findUserByUsername,
  findUserByUsernameOrEmail as _findUserByUsernameOrEmail,
  updateUserById as _updateUserById,
  updateUserPrivilegeById as _updateUserPrivilegeById,
} from "../model/repository.js";

/**
 * POST /users
 * Local signup (email/password)
 * Expects: { username, fullname, email, password }
 */
export async function createUser(req, res) {
  try {
    const { username, fullname, email, password } = req.body;

    if (!username || !fullname || !email || !password) {
      return res
        .status(400)
        .json({ message: "username and/or fullname and/or email and/or password are missing" });
    }

    const existingUser = await _findUserByUsernameOrEmail(username, email);
    if (existingUser) {
      return res.status(409).json({ message: "username or email already exists" });
    }

    // repo hashes the password internally
    const createdUser = await _createLocalUser({ username, fullname, email, password });

    return res.status(201).json({
      message: `Created new user ${createdUser.username} successfully`,
      data: formatUserResponse(createdUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when creating new user!" });
  }
}

/**
 * GET /users/:id
 */
export async function getUser(req, res) {
  try {
    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
    return res.status(200).json({ message: "Found user", data: formatUserResponse(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting user!" });
  }
}

/**
 * GET /users
 */
export async function getAllUsers(_req, res) {
  try {
    const users = await _findAllUsers();
    return res.status(200).json({ message: "Found users", data: users.map(formatUserResponse) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when getting all users!" });
  }
}

/**
 * PATCH /users/:id
 * Accepts any subset of fields; repo handles hashing if password present.
 * Body: { username?, fullname?, email?, password?, avatarUrl? }
 */
export async function updateUser(req, res) {
  try {
    const { username, fullname, email, password, avatarUrl } = req.body;

    if (!username && !fullname && !email && !password && avatarUrl === undefined) {
      return res
        .status(400)
        .json({ message: "No field to update: username/fullname/email/password/avatarUrl are all missing!" });
    }

    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    // Uniqueness checks if username/email are changing
    if (username) {
      const existingUser = await _findUserByUsername(username);
      if (existingUser && String(existingUser.id) !== String(userId)) {
        return res.status(409).json({ message: "username already exists" });
      }
    }
    if (email) {
      const existingUser = await _findUserByEmail(email);
      if (existingUser && String(existingUser.id) !== String(userId)) {
        return res.status(409).json({ message: "email already exists" });
      }
    }

    const updatedUser = await _updateUserById(userId, {
      username,
      fullname,
      email,
      password,   // repo will hash if provided
      avatarUrl,
    });

    return res.status(200).json({
      message: `Updated data for user ${userId}`,
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user!" });
  }
}

/**
 * PATCH /users/:id/privilege
 * Body: { isAdmin: boolean }
 */
export async function updateUserPrivilege(req, res) {
  try {
    const { isAdmin } = req.body;

    if (isAdmin === undefined) {
      return res.status(400).json({ message: "isAdmin is missing!" });
    }

    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    const updatedUser = await _updateUserPrivilegeById(userId, isAdmin === true);
    return res.status(200).json({
      message: `Updated privilege for user ${userId}`,
      data: formatUserResponse(updatedUser),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when updating user privilege!" });
  }
}

/**
 * DELETE /users/:id
 */
export async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    if (!isValidObjectId(userId)) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }
    const user = await _findUserById(userId);
    if (!user) {
      return res.status(404).json({ message: `User ${userId} not found` });
    }

    await _deleteUserById(userId);
    return res.status(200).json({ message: `Deleted user ${userId} successfully` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Unknown error when deleting user!" });
  }
}

/* ---------- response shape ---------- */
export function formatUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    email: user.email ?? null,
    avatarUrl: user.avatarUrl ?? "",
    isAdmin: !!user.isAdmin,
    createdAt: user.createdAt,
  };
}
