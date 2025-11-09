require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/ai/", rateLimit({ windowMs: 60_000, max: 60 }));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
// --- OpenRouter client ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

app.get("/health", (_, res) => res.json({ ok: true }));

function sse(res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
}

// POST /ai/explain — streams via SSE
app.post("/ai/explain", async (req, res) => {
  const {
    code,
    language = "text",
    problem = "",
    selectionRange = null,
    chatContext = [],
  } = req.body || {};
  if (!code || typeof code !== "string")
    return res.status(400).json({ error: "Missing 'code' string" });

  sse(res);

  const sys = [
    "You are an assistant for pair-programming sessions.",
    "Explain code clearly, step-by-step. Include Complexity and Pitfalls.",
  ].join("\n");

  const user = [
    `Language: ${language}`,
    problem ? `Problem: ${problem}` : "",
    selectionRange
      ? `Selected offsets: ${selectionRange.start}-${selectionRange.end}`
      : "",
    "Code:\n```" + language + "\n" + code + "\n```",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      stream: true,
      messages: [
        { role: "system", content: sys },
        ...(Array.isArray(chatContext) ? chatContext : []),
        { role: "user", content: user },
      ],
    });

    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content || "";
      if (delta)
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: delta })}\n\n`);
    }
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (e) {
    console.error(e);
    try {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: "LLM error" })}\n\n`
      );
      res.end();
    } catch {
      if (!res.headersSent) res.status(500).json({ error: "LLM error" });
    }
  }
});

// POST /api/ai/chat  — { messages: [{role:"user"|"assistant"|"system", content:string}] }
app.post("/ai/chat", async (req, res) => {
  const { messages = [], context } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing 'messages'[]" });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const baseSys =
    "You are a concise coding interview tutor. Use the provided CURRENT_QUESTION_CONTEXT_JSON if present. " +
    "If hasCode=false or user asks to explain code without code, explain the question, outline an approach, give high-level pseudocode, and pitfalls. " +
    "If hasCode=true and user asks about code, review that code.";
    // Build final message list
  const final = [...messages];

  // Only add if caller didn't already set a system message
  const alreadyHasSystem = final.some((m) => m.role === "system");
  if (!alreadyHasSystem) {
    final.unshift({ role: "system", content: baseSys });
  }

  // If caller provided a compact context object, inject as a second system message
  if (context) {
    const safeJson = JSON.stringify(context);
    final.unshift({
      role: "system",
      content: `CURRENT_QUESTION_CONTEXT_JSON=${safeJson}`,
    });
  }
  try {
    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL  || "gpt-4",
      stream: true,
      messages: final,
    });

    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content || "";
      if (delta)
        res.write(`event: chunk\ndata: ${JSON.stringify({ text: delta })}\n\n`);
    }
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (e) {
    console.error(e);
    try {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: "LLM error" })}\n\n`
      );
      res.end();
    } catch {
      if (!res.headersSent) res.status(500).json({ error: "LLM error" });
    }
  }
});

const port = process.env.PORT;
app.listen(port, () => console.log(`API listening on :${port}`));
