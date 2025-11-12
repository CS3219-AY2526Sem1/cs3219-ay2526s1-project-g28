import http from "http";
import index from "./index.js";
import "dotenv/config";
import { connectToDB } from "./model/repository.js";

// --- FIX 1: Import your new Kafka connection function ---
import { connectKafka } from "./kafka-utilties.js";

const port = process.env.QUESTION_SERVICE_PORT || 3002;
const server = http.createServer(index);

// --- FIX 2: Use an async function for cleaner startup ---
const startServer = async () => {
  try {
    // Connect to your Database
    console.log("Connecting to MongoDB...");
    await connectToDB();
    console.log("MongoDB Connected!");

    // --- FIX 3: Connect to Kafka ---
    // This will connect the producer AND start the consumer
    console.log("Connecting to Kafka...");
    await connectKafka();
    console.log("Kafka Connected!");

    // Now that all connections are ready, start the server
    server.listen(port, () => {
      console.log(
        `Question service server listening on http://localhost:${port}`
      );
    });
  } catch (err) {
    // If DB or Kafka fails to connect, log it and exit
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

// --- FIX 4: Call the startup function ---
startServer();
