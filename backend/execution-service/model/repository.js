import vm from "vm";

/**
 * Executes user code for each test case safely.
 * @param {string} code - User-submitted code
 * @param {Array<{args: any, expected: any}>} testCases - Array of test cases
 * @param {number} timeout - Timeout in ms (default 1000)
 * @returns {Promise<Array<{args:any, expected:any, output:any, result:boolean, error:string|null}>>}
 */
export async function executeUserCode(code, testCases, timeout = 1000) {
  // Extract function name
  const matchFn = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
  if (!matchFn) throw new Error("No function found in user code");
  const functionName = matchFn[1];

  const results = [];

  for (const tc of testCases) {
    try {
      const sandbox = {
        args: tc.args,
        output: null,
        console: { log: () => {} },
      };

      const script = new vm.Script(`
        ${code}
        output = Array.isArray(args) ? ${functionName}(...args) : ${functionName}(args);
      `);
      const context = vm.createContext(sandbox);

      // Run code with timeout
      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Time limit exceeded")),
          timeout
        );
        try {
          script.runInContext(context);
          clearTimeout(timer);
          resolve(sandbox.output);
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });

      // Check if output matches expected
      const isMatch = JSON.stringify(result) === JSON.stringify(tc.expected);

      results.push({
        ...tc,
        output: result,
        result: isMatch,
        error: null, // no runtime error
      });
    } catch (err) {
      results.push({
        ...tc,
        output: null,
        result: false,
        error: err.message || "Runtime error",
      });
    }
  }

  return results;
}
