import "dotenv/config";
import http from "http";
import index from "./index.js";

async function startServer() {
  const port = process.env.PORT || 3006;
  const server = http.createServer(index);

  try {
    server.listen(port, () => {
      console.log(`Matching service listening on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:");
    console.error(err);
    process.exit(1);
  }
}

startServer();
