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
    const { correlationId } = req.params;
    const session = await Session.findOneAndUpdate(
      { correlationId },
      { isActive: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    res.status(200).json({ message: "Session ended" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSession(req, res) {
  try {
    const { correlationId } = req.params;
    const session = await Session.findOne({ correlationId});
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // If startedAt is null, set it now (first time anyone opens the session)
    if (!session.startedAt) {
      session.startedAt = new Date();
      await session.save();
    }
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
