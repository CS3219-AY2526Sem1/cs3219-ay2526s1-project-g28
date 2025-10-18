import redis from '../server.js';

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
      await removeUserFromAllQueues(waitingUserId, matchedUserData.difficulty, JSON.parse(matchedUserData.topics));

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

export async function createPendingMatch(user1, user2, difficulty, topics, topic) {
  const matchId = `match:${Date.now()}`;
  await redis.hset(matchId, user1, "pending", user2, "pending");
  await redis.set(
    `${matchId}:meta`,
    JSON.stringify({ difficulty, topics, matchedTopic: topic, createdAt: new Date().toISOString() }),
    "EX",
    10 // expires in 10 seconds
  );
  return matchId;
}

export async function acceptMatch(userId, matchId) {
  const matchKey = matchId;
  const matchExists = await redis.exists(matchKey);

  if (!matchExists) {
    return { status: "error", message: "Match not found or expired." };
  }

  await redis.hset(matchKey, userId, "accepted");

  const matchData = await redis.hgetall(matchKey);
  const allAccepted = Object.values(matchData).every((status) => status === "accepted");

  if (allAccepted) {
    const meta = await redis.get(`${matchKey}:meta`);
    const parsedMeta = meta ? JSON.parse(meta) : {};

    await redis.del(matchKey);
    await redis.del(`${matchKey}:meta`);

    return {
      status: "confirmed",
      message: "Both users accepted the match!",
      data: {
        matchId,
        users: Object.keys(matchData),
        ...parsedMeta,
      },
    };
  }

  return { status: "pending", message: "Waiting for the other user to accept." };
}
