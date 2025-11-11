import http from "http";
import { pathToFileURL } from "url";
import index from "./index.js";
import "dotenv/config";
import { connectToDB } from "./model/repository.js";
import { getNumericEnvVar } from "./utils/env.js";

const port = getNumericEnvVar("PORT", 3001);
const server = http.createServer(index);
let startupPromise = null;

export function startServer() {
  if (!startupPromise) {
    startupPromise = (async () => {
      await connectToDB();
      console.log("MongoDB Connected!");

      await new Promise((resolve, reject) => {
        server.listen(port, (err) => {
          if (err) return reject(err);
          console.log(`User service server listening on port ${port}`);
          resolve();
        });
      });

      return server;
    })().catch((err) => {
      console.error("Failed to start user service server");
      console.error(err);
      startupPromise = null;
      throw err;
    });
  }

  return startupPromise;
}

export function getServer() {
  return server;
}

const entryPoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;

if (entryPoint && import.meta.url === entryPoint) {
  startServer().catch(() => {
    process.exitCode = 1;
  });
}
