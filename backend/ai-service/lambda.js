// lambda.js
import serverless from "serverless-http";
import app from "./server.js";

export const handler = async (event, context) => {
  const expressHandler = serverless(app);
  return expressHandler(event, context);
};
