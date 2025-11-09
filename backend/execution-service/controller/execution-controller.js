import { executeUserCode } from "../model/repository.js";

export async function runCode(req, res) {
  const { language, code, input, timeout } = req.body;
  try {
    const output = await executeUserCode(language, code, input, timeout);
    res.json({ success: true, output });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}
