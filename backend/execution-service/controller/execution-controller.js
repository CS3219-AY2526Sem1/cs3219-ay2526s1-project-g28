import { executeUserCode } from "../model/repository.js";

const hiddenTests = [
  // Small numbers
  { input: [1, 2, 3], expected: 6 },
  { input: [4, 5, 6], expected: 15 },

  // Single element
  { input: [10], expected: 10 },

  // Empty array
  { input: [], expected: 0 },

  // Medium-sized array
  { input: Array.from({ length: 100 }, (_, i) => i + 1), expected: 5050 },

  // Negative numbers
  { input: [-1, -2, -3], expected: -6 },
];

export async function runCode(req, res) {
  const { code, input } = req.body;
  try {
    const output = await executeUserCode(code, input, 1000); // 1s timeout
    res.json({ success: true, output });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}

export async function submitCode(req, res) {
  const { code } = req.body;
  try {
    const results = [];
    for (const test of hiddenTests) {
      const output = await executeUserCode(code, test.input, 2000); // 2s timeout
      const passed = output === test.expected;
      results.push({
        input: test.input,
        expected: test.expected,
        output,
        passed,
      });
    }

    const allPassed = results.every((r) => r.passed);
    res.json({ success: true, allPassed, results });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}
