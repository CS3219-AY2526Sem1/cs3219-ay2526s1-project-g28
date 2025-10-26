import http from "http";
import index from "./index.js";
import "dotenv/config";
import "./utils/redisClient.js"; // Import to initialize the connection
import connectKafka from "./kafka-utilties.js";

const port = process.env.PORT || 3003;
const server = http.createServer(index);

const startServer = async () => {
  try {
    console.log("Connecting to Kafka...");
    await connectKafka(); // This connects producer AND starts consumer
    console.log("Connected to Kafka successfully!");

    server.listen(port, () => {
      console.log(`Matching service listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

// --- NO MORE "export default redis" ---