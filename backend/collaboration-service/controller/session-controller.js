import Session from "../model/session-model.js";

export async function createSession(req, res) {
  try {
    const session = await Session.create(req.body);
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function endSession(req, res) {
  try {
    const { sessionId } = req.params;
    await Session.findByIdAndUpdate(sessionId, { isActive: false });
    res.status(200).json({ message: "Session ended" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
