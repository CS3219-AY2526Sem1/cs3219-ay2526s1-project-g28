import redis from "../server.js";
import { producer } from "../kafka-utilties.js";

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

      await removeUserFromAllQueues(userId, difficulty, topics);
      await removeUserFromAllQueues(
        waitingUserId,
        matchedUserData.difficulty,
        JSON.parse(matchedUserData.topics)
      );

      const matchId = await createPendingMatch(
        userId,
        waitingUserId,
        difficulty,
        topics,
        topic
      );

      console.log(`Match found for ${userId} with ${waitingUserId} on topic ${topic}`);
      return { matchId, matchedWith: waitingUserId, topic: topic };
    }
  }

  // 2. No match found, store the user's full request and add to queues
  console.log(`No match found for ${userId}. Adding to queues.`);
  // Store the full request
  await redis.hmset(getUserKey(userId), {
    difficulty,
    topics: JSON.stringify(topics), // Store array as a JSON string
  });

  // Add user to all relevant topic queues
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
    60 // expires in 10 seconds
  );
  return matchId;
}

export async function acceptMatch(userId, matchId) {
  const matchKey = matchId;
  const matchExists = await redis.exists(matchKey);

  if (!matchExists) {
    return { status: "error", message: "Match not found or expired." };
  }

  // Set this user's status to accepted
  await redis.hset(matchKey, userId, "accepted");

  const matchData = await redis.hgetall(matchKey);
  const statuses = Object.values(matchData);

  // If any user has rejected, resolve the match immediately
  if (statuses.includes("rejected")) {
    const meta = await redis.get(`${matchKey}:meta`);
    const parsedMeta = meta ? JSON.parse(meta) : {};
    const users = Object.keys(matchData);
    const rejector = users.find((u) => matchData[u] === "rejected");
    const acceptor = users.find((u) => matchData[u] === "accepted");

    // Clean up Redis keys
    await redis.del(matchKey);
    await redis.del(`${matchKey}:meta`);

    // Handle requeue/reject logic
    if (acceptor && rejector) {
      // Requeue acceptor
      await redis.hmset(`user:${acceptor}`, {
        difficulty: parsedMeta.difficulty,
        topics: JSON.stringify(parsedMeta.topics),
      });
      const pipeline = redis.pipeline();
      for (const t of parsedMeta.topics) {
        pipeline.sadd(`queue:${parsedMeta.difficulty}:${t}`, acceptor);
      }
      await pipeline.exec();
    }

    console.log(`Match ${matchId} resolved — ${rejector} rejected, ${acceptor} requeued.`);

    return {
      status: "requeued",
      message: "One user rejected, acceptor requeued.",
      data: { acceptor, rejector },
    };
  }

  // If all users accepted
  const allAccepted = statuses.every((s) => s === "accepted");
  if (allAccepted) {
    const meta = await redis.get(`${matchKey}:meta`);
    const parsedMeta = meta ? JSON.parse(meta) : {};

    await redis.del(matchKey);
    await redis.del(`${matchKey}:meta`);

    // Publish match_found event to Kafka
    const users = Object.keys(matchData);
    const matchEvent = {
      matchId,
      userA: { id: users[0], username: "N/A" }, // replace with actual username if stored
      userB: { id: users[1], username: "N/A" },
      questionId: parsedMeta.questionId,
      timestamp: new Date().toISOString(),
    };

    await producer.send({
      topic: "match_found",
      messages: [
        { value: JSON.stringify(matchEvent) },
      ],
    });
    console.log(`[Matching] Published match_found event for match ${matchId}`);

    return {
      status: "confirmed",
      message: "Both users accepted the match!",
      data: {
        matchId,
        users,
        ...parsedMeta,
      },
    };
  }

  // Otherwise, still waiting
  return { status: "pending", message: "Waiting for the other user to respond." };
}

export async function rejectMatch(userId, matchId) {
  const matchKey = matchId;
  const matchExists = await redis.exists(matchKey);

  if (!matchExists) {
    return { status: "error", message: "Match not found or expired." };
  }

  // Mark this user as rejected
  await redis.hset(matchKey, userId, "rejected");

  const matchData = await redis.hgetall(matchKey);
  const users = Object.keys(matchData);
  const statuses = Object.values(matchData);

  // Get match metadata
  const metaStr = await redis.get(`${matchKey}:meta`);
  const meta = metaStr ? JSON.parse(metaStr) : null;

  if (!meta) {
    return { status: "error", message: "Match metadata missing or expired." };
  }

  const [user1, user2] = users;
  const [status1, status2] = statuses;

  // CASE 1: both rejected
  if (status1 === "rejected" && status2 === "rejected") {
    await redis.del(matchKey);
    await redis.del(`${matchKey}:meta`);
    await removeUserFromAllQueues(user1, meta.difficulty, meta.topics);
    await removeUserFromAllQueues(user2, meta.difficulty, meta.topics);

    return { status: "rejected", message: "Both users rejected. Match deleted." };
  }

  // CASE 2: one accepted, one rejected
  if (statuses.includes("accepted") && statuses.includes("rejected")) {
    const acceptor = users.find((u) => matchData[u] === "accepted");
    const rejector = users.find((u) => matchData[u] === "rejected");

    await redis.del(matchKey);
    await redis.del(`${matchKey}:meta`);
    await removeUserFromAllQueues(rejector, meta.difficulty, meta.topics);

    // Re-add the acceptor to the queue
    const pipeline = redis.pipeline();
    pipeline.hmset(getUserKey(acceptor), {
      difficulty: meta.difficulty,
      topics: JSON.stringify(meta.topics),
    });
    for (const topic of meta.topics) {
      pipeline.sadd(getTopicKey(meta.difficulty, topic), acceptor);
    }
    await pipeline.exec();

    return {
      status: "requeued",
      message: "One user rejected. Acceptor requeued.",
      data: { acceptor },
    };
  }

  // CASE 3: waiting for the other user’s decision
  return { status: "pending", message: "Waiting for the other user’s response." };
}
