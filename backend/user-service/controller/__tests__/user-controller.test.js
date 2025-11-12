import test, { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";

import {
  createUser,
  verifyEmail,
  updateUser,
  formatUserResponse,
  __setTestDeps,
  __resetTestDeps,
} from "../user-controller.js";

const { mock } = test;

process.env.EMAIL_VERIFICATION_TTL_HOURS = "48";

function createRepositoryMocks() {
  return {
    createLocalUser: mock.fn(),
    deleteUserById: mock.fn(),
    findAllUsers: mock.fn(),
    findUserByEmail: mock.fn(),
    findUserById: mock.fn(),
    findUserByUsername: mock.fn(),
    findUserByUsernameOrEmail: mock.fn(),
    findUserByEmailVerificationTokenHash: mock.fn(),
    updateUserById: mock.fn(),
    updateUserPrivilegeById: mock.fn(),
    markUserEmailVerified: mock.fn(),
  };
}

function createEmailServiceMocks() {
  return {
    sendVerificationEmail: mock.fn(),
    buildVerificationUrl: mock.fn(),
  };
}

function createMockResponse() {
  const res = {};
  res.status = mock.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = mock.fn((payload) => {
    res.body = payload;
    return res;
  });
  return res;
}

let repositoryMocks;
let emailMocks;

beforeEach(() => {
  repositoryMocks = createRepositoryMocks();
  emailMocks = createEmailServiceMocks();
  __setTestDeps({ repository: repositoryMocks, email: emailMocks });
});

afterEach(() => {
  __resetTestDeps();
  mock.restoreAll();
});

describe("formatUserResponse", () => {
  it("returns the expected shape with defaults", () => {
    const user = {
      id: "507f1f77bcf86cd799439011",
      username: "tester",
      fullname: "Test User",
      email: undefined,
      avatarUrl: undefined,
      isAdmin: 0,
      isEmailVerified: 0,
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      providers: [],
    };

    assert.deepStrictEqual(formatUserResponse(user), {
      id: "507f1f77bcf86cd799439011",
      username: "tester",
      fullname: "Test User",
      email: null,
      avatarUrl: "",
      isAdmin: false,
      isEmailVerified: false,
      createdAt: user.createdAt,
      provider: "password",
    });
  });
});

describe("createUser", () => {
  it("returns 400 when required fields are missing", async () => {
    const req = { body: {} };
    const res = createMockResponse();

    await createUser(req, res);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
      message: "username and/or fullname and/or email and/or password are missing",
    });
    assert.strictEqual(repositoryMocks.createLocalUser.mock.calls.length, 0);
  });

  it("returns 409 when username or email already exists", async () => {
    repositoryMocks.findUserByUsernameOrEmail.mock.mockImplementation(async () => ({ id: "existing" }));
    const req = {
      body: {
        username: "tester",
        fullname: "Test User",
        email: "test@example.com",
        password: "secret",
      },
    };
    const res = createMockResponse();

    await createUser(req, res);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 409);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
      message: "username or email already exists",
    });
    assert.strictEqual(repositoryMocks.createLocalUser.mock.calls.length, 0);
  });

  it("creates a user, dispatches verification email and returns response payload", async () => {
    const baseDate = new Date("2024-01-01T00:00:00.000Z");
    const originalNow = Date.now;
    Date.now = () => baseDate.getTime();
    const originalRandomBytes = crypto.randomBytes;
    crypto.randomBytes = () => Buffer.from("a".repeat(64), "hex");

    const req = {
      body: {
        username: "tester",
        fullname: "Test User",
        email: "test@example.com",
        password: "secret",
      },
    };
    const res = createMockResponse();

    repositoryMocks.findUserByUsernameOrEmail.mock.mockImplementation(async () => null);
    const createdUser = {
      id: "507f1f77bcf86cd799439011",
      username: "tester",
      fullname: "Test User",
      email: "test@example.com",
      avatarUrl: "https://avatar",
      isAdmin: true,
      isEmailVerified: false,
      createdAt: baseDate,
      providers: [{ provider: "password" }],
    };
    repositoryMocks.createLocalUser.mock.mockImplementation(async () => createdUser);

    emailMocks.buildVerificationUrl.mock.mockImplementation(() => "https://verify-link");
    emailMocks.sendVerificationEmail.mock.mockImplementation(async () => {});

    try {
      await createUser(req, res);
    } finally {
      Date.now = originalNow;
      crypto.randomBytes = originalRandomBytes;
    }

    const verificationToken = Buffer.from("a".repeat(64), "hex").toString("hex");
    const expectedTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

    assert.strictEqual(repositoryMocks.createLocalUser.mock.calls.length, 1);
    const createArgs = repositoryMocks.createLocalUser.mock.calls[0].arguments[0];
    assert.deepStrictEqual(
      {
        username: createArgs.username,
        fullname: createArgs.fullname,
        email: createArgs.email,
        password: createArgs.password,
        emailVerificationTokenHash: createArgs.emailVerificationTokenHash,
      },
      {
        username: "tester",
        fullname: "Test User",
        email: "test@example.com",
        password: "secret",
        emailVerificationTokenHash: expectedTokenHash,
      },
    );

    const expiration = res.body.data.emailVerification.expiresAt;
    assert.ok(expiration instanceof Date);
    assert.strictEqual(expiration.getTime(), baseDate.getTime() + 48 * 60 * 60 * 1000);

    assert.strictEqual(emailMocks.buildVerificationUrl.mock.calls[0].arguments[0], verificationToken);
    assert.deepStrictEqual(emailMocks.sendVerificationEmail.mock.calls[0].arguments[0], {
      to: "test@example.com",
      name: "Test User",
      verificationUrl: "https://verify-link",
      expiresAt: expiration,
    });

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 201);
    assert.match(res.body.message, /Created new user tester successfully/);
    assert.deepStrictEqual(
      {
        id: res.body.data.id,
        username: res.body.data.username,
        fullname: res.body.data.fullname,
        email: res.body.data.email,
        avatarUrl: res.body.data.avatarUrl,
        isAdmin: res.body.data.isAdmin,
        isEmailVerified: res.body.data.isEmailVerified,
        provider: res.body.data.provider,
        dispatched: res.body.data.emailVerification.dispatched,
      },
      {
        id: "507f1f77bcf86cd799439011",
        username: "tester",
        fullname: "Test User",
        email: "test@example.com",
        avatarUrl: "https://avatar",
        isAdmin: true,
        isEmailVerified: false,
        provider: "password",
        dispatched: true,
      },
    );
  });
});

describe("verifyEmail", () => {
  it("returns 400 when token is missing", async () => {
    const req = { query: {} };
    const res = createMockResponse();

    await verifyEmail(req, res);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
      message: "Verification token is required",
    });
  });

  it("marks the user email as verified and returns updated user", async () => {
    const token = "token";
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = {
      id: "507f1f77bcf86cd799439011",
      username: "tester",
      fullname: "Test User",
      email: "test@example.com",
      avatarUrl: "https://avatar",
      isAdmin: false,
      isEmailVerified: false,
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
      providers: [{ provider: "github" }],
    };

    const updatedUser = { ...user, isEmailVerified: true };

    repositoryMocks.findUserByEmailVerificationTokenHash.mock.mockImplementation(async () => user);
    repositoryMocks.markUserEmailVerified.mock.mockImplementation(async () => updatedUser);

    const req = { query: { token } };
    const res = createMockResponse();

    await verifyEmail(req, res);

    assert.strictEqual(
      repositoryMocks.findUserByEmailVerificationTokenHash.mock.calls[0].arguments[0],
      tokenHash,
    );
    assert.strictEqual(repositoryMocks.markUserEmailVerified.mock.calls[0].arguments[0], user.id);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 200);
    assert.deepStrictEqual(res.body, {
      message: "Email verified successfully",
      data: {
        id: "507f1f77bcf86cd799439011",
        username: "tester",
        fullname: "Test User",
        email: "test@example.com",
        avatarUrl: "https://avatar",
        isAdmin: false,
        isEmailVerified: true,
        createdAt: user.createdAt,
        provider: "github",
      },
    });
  });
});

describe("updateUser", () => {
  it("returns 400 when no fields are provided", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" }, body: {} };
    const res = createMockResponse();

    await updateUser(req, res);

    assert.strictEqual(res.status.mock.calls[0].arguments[0], 400);
    assert.deepStrictEqual(res.json.mock.calls[0].arguments[0], {
      message: "No field to update: username/fullname/email/password/avatarUrl are all missing!",
    });
  });

  it("sends email verification when email is changed", async () => {
    const userId = "507f1f77bcf86cd799439011";
    const baseDate = new Date("2024-01-01T00:00:00.000Z");
    const originalNow = Date.now;
    Date.now = () => baseDate.getTime();
    const originalRandomBytes = crypto.randomBytes;
    crypto.randomBytes = () => Buffer.from("b".repeat(64), "hex");

    const existingUser = {
      id: userId,
      username: "tester",
      fullname: "Test User",
      email: "old@example.com",
      avatarUrl: "https://avatar",
      isAdmin: false,
      isEmailVerified: true,
      createdAt: baseDate,
      providers: [{ provider: "password" }],
    };

    repositoryMocks.findUserById.mock.mockImplementation(async () => existingUser);
    repositoryMocks.findUserByUsername.mock.mockImplementation(async () => null);
    repositoryMocks.findUserByEmail.mock.mockImplementation(async () => null);
    repositoryMocks.updateUserById.mock.mockImplementation(async (_id, payload) => ({
      ...existingUser,
      ...payload,
    }));

    emailMocks.buildVerificationUrl.mock.mockImplementation(() => "https://verify-link");
    emailMocks.sendVerificationEmail.mock.mockImplementation(async () => {});

    const req = {
      params: { id: userId },
      body: {
        email: "new@example.com",
      },
    };
    const res = createMockResponse();

    try {
      await updateUser(req, res);
    } finally {
      Date.now = originalNow;
      crypto.randomBytes = originalRandomBytes;
    }

    const verificationToken = Buffer.from("b".repeat(64), "hex").toString("hex");
    const expectedTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");

    assert.strictEqual(repositoryMocks.updateUserById.mock.calls.length, 1);
    const updateArgs = repositoryMocks.updateUserById.mock.calls[0].arguments[1];
    assert.deepStrictEqual(
      {
        email: updateArgs.email,
        isEmailVerified: updateArgs.isEmailVerified,
        emailVerificationTokenHash: updateArgs.emailVerificationTokenHash,
      },
      {
        email: "new@example.com",
        isEmailVerified: false,
        emailVerificationTokenHash: expectedTokenHash,
      },
    );

    assert.match(res.body.message, new RegExp(`Updated data for user ${userId}`));
    assert.deepStrictEqual(res.body.emailVerification, {
      dispatched: true,
      expiresAt: res.body.emailVerification.expiresAt,
      email: "new@example.com",
    });
    assert.ok(res.body.emailVerification.expiresAt instanceof Date);

    const sendArgs = emailMocks.sendVerificationEmail.mock.calls[0].arguments[0];
    assert.strictEqual(sendArgs.to, "new@example.com");
    assert.strictEqual(sendArgs.verificationUrl, "https://verify-link");
  });
});
