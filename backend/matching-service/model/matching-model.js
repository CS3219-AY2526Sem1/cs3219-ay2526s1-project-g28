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

      console.log(`Match found for ${userId} with ${waitingUserId} on topic ${topic}`);
      return { matchedWith: waitingUserId, topic: topic };
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