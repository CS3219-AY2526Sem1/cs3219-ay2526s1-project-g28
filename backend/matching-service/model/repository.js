import redis from "../utils/redisClient.js";

const publisher = redis.duplicate();
const MATCH_CHANNEL = "match_events";

const getTopicKey = (difficulty, topic) => `queue:${difficulty}:${topic}`;
const getUserKey = (userId) => `user:${userId}`;

async function removeUserFromAllQueues(userId, difficulty, topics) {
  const pipeline = redis.pipeline();
  pipeline.del(getUserKey(userId));
  for (const topic of topics) {
    const topicKey = getTopicKey(difficulty, topic);
    pipeline.srem(topicKey, userId);
  }
  await pipeline.exec();
}

export async function findMatch(userId, difficulty, topics) {
  for (const topic of topics) {
    const topicKey = getTopicKey(difficulty, topic);
    const waitingUserId = await redis.spop(topicKey);

    if (waitingUserId && waitingUserId !== userId) {
      const matchedUserData = await redis.hgetall(getUserKey(waitingUserId));

      if (
        !matchedUserData ||
        !matchedUserData.difficulty ||
        !matchedUserData.topics
      ) {
        await redis.sadd(topicKey, waitingUserId);
        continue;
      }

      const parsedTopics = JSON.parse(matchedUserData.topics);

      await removeUserFromAllQueues(userId, difficulty, topics);
      await removeUserFromAllQueues(
        waitingUserId,
        matchedUserData.difficulty,
        parsedTopics
      );

      const matchId = await createPendingMatch(
        userId,
        waitingUserId,
        difficulty,
        parsedTopics,
        topic
      );

      const payload = {
        type: "pending_match_created",
        matchId: matchId,
        users: [userId, waitingUserId],
        topic: topic,
        difficulty: difficulty,
      };
      await publisher.publish(MATCH_CHANNEL, JSON.stringify(payload));

      console.log(
        `Match found for ${userId} with ${waitingUserId} on topic ${topic}`
      );
      return { matchId, matchedWith: waitingUserId, topic: topic };
    }
  }

  console.log(`No match found for ${userId}. Adding to queues.`);
  await redis.hmset(getUserKey(userId), {
    difficulty,
    topics: JSON.stringify(topics),
  });

  const pipeline = redis.pipeline();
  for (const topic of topics) {
    const topicKey = getTopicKey(difficulty, topic);
    pipeline.sadd(topicKey, userId);
  }
  await pipeline.exec();

  return null;
}

export async function cancelMatchmaking(userId) {
  const userKey = getUserKey(userId);
  const userData = await redis.hgetall(userKey);

  if (!userData || !userData.topics) {
    return false;
  }

  const difficulty = userData.difficulty;
  const topics = JSON.parse(userData.topics);

  const pipeline = redis.pipeline();
  pipeline.del(userKey);
  for (const topic of topics) {
    const topicKey = getTopicKey(difficulty, topic);
    pipeline.srem(topicKey, userId);
  }

  await pipeline.exec();
  console.log(`User ${userId} has been removed from the matchmaking queue.`);
  return true;
}

export async function createPendingMatch(
  user1,
  user2,
  difficulty,
  topics,
  topic
) {
  const matchId = `match:${Date.now()}`;
  await redis.hset(matchId, user1, "pending", user2, "pending");
  await redis.set(
    `${matchId}:meta`,
    JSON.stringify({
      difficulty,
      topics,
      matchedTopic: topic,
      createdAt: new Date().toISOString(),
    }),
    "EX",
    60
  );
  return matchId;
}

async function resolveMatch(matchKey, matchData, meta, clickedUserId) {
  await redis.del(matchKey);
  await redis.del(`${matchKey}:meta`);

  const users = Object.keys(matchData);
  const statuses = Object.values(matchData);
  const acceptor = users.find((u) => matchData[u] === "accepted");
  const rejector = users.find((u) => matchData[u] === "rejected");

  const waitingUser = users.find((u) => u !== clickedUserId);

  if (acceptor && !rejector) {
    const confirmedData = { matchId: matchKey, users, ...meta };
    const socketPayload = {
      type: "match_confirmed",
      users: [waitingUser],
      message: "Match Confirmed! Moving to room...",
    };
    await publisher.publish(MATCH_CHANNEL, JSON.stringify(socketPayload));
    return {
      status: "confirmed",
      message: "Match Confirmed! Moving to room...",
      data: confirmedData,
    };
  }

  if (acceptor && rejector) {
    const pipeline = redis.pipeline();
    pipeline.hmset(getUserKey(acceptor), {
      difficulty: meta.difficulty,
      topics: JSON.stringify(meta.topics),
    });
    for (const topic of meta.topics) {
      pipeline.sadd(getTopicKey(meta.difficulty, topic), acceptor);
    }
    await pipeline.exec();
    const requeuePayload = {
      type: "match_requeued",
      userId: acceptor,
      message: "Your match has rejected. You will be requeued.",
    };
    await publisher.publish(MATCH_CHANNEL, JSON.stringify(requeuePayload));
    const rejectPayload = {
      type: "match_rejected",
      userId: rejector,
      message: "You have rejected the match.",
    };
    await publisher.publish(MATCH_CHANNEL, JSON.stringify(rejectPayload));
    if (clickedUserId === acceptor) {
      return {
        status: "requeued",
        message: "Your match has rejected. You will be requeued.",
      };
    } else {
      return { status: "rejected", message: "You have rejected the match." };
    }
  }

  await removeUserFromAllQueues(users[0], meta.difficulty, meta.topics);
  await removeUserFromAllQueues(users[1], meta.difficulty, meta.topics);
  const rejectPayload = {
    type: "match_rejected",
    users: [waitingUser],
    message: "You have rejected the match.",
  };
  await publisher.publish(MATCH_CHANNEL, JSON.stringify(rejectPayload));
  return {
    status: "rejected",
    message: "You have rejected the match.",
  };
}

export async function acceptMatch(userId, matchId) {
  const matchKey = matchId;
  const matchExists = await redis.exists(matchKey);
  if (!matchExists) {
    return { status: "error", message: "Match not found or expired." };
  }

  await redis.hset(matchKey, userId, "accepted");
  const matchData = await redis.hgetall(matchKey);
  const statuses = Object.values(matchData);

  if (statuses.includes("pending")) {
    return {
      status: "pending",
      message: "Waiting for the other user to respond.",
    };
  }

  const metaStr = await redis.get(`${matchKey}:meta`);
  const meta = metaStr ? JSON.parse(metaStr) : null;
  if (!meta) {
    return { status: "error", message: "Match metadata missing or expired." };
  }

  return await resolveMatch(matchKey, matchData, meta, userId);
}

export async function rejectMatch(userId, matchId) {
  const matchKey = matchId;
  const matchExists = await redis.exists(matchKey);
  if (!matchExists) {
    return { status: "error", message: "Match not found or expired." };
  }

  await redis.hset(matchKey, userId, "rejected");
  const matchData = await redis.hgetall(matchKey);
  const statuses = Object.values(matchData);

  if (statuses.includes("pending")) {
    return {
      status: "pending",
      message: "Waiting for the other user to respond.",
    };
  }

  const metaStr = await redis.get(`${matchKey}:meta`);
  const meta = metaStr ? JSON.parse(metaStr) : null;
  if (!meta) {
    return { status: "error", message: "Match metadata missing or expired." };
  }

  return await resolveMatch(matchKey, matchData, meta, userId);
}
