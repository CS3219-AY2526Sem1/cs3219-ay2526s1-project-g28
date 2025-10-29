import vm from "vm";

export async function executeUserCode(code, input, timeout = 1000) {
  const match = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
  if (!match) throw new Error("No function found in user code");
  const functionName = match[1];
  for (const { args, expected } of input) {
    try {
      const sandbox = { args, output: null, console: { log: () => {} } };
      const script = new vm.Script(`
        ${code}
        output = Array.isArray(args) ? ${functionName}(...args) : ${functionName}(args);
      `);
      const context = vm.createContext(sandbox);

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

      const match = JSON.stringify(result) === JSON.stringify(expected);
      if (!match) {
        console.log("Test failed:", { input, expected, got: result });
        return false;
      }
    } catch (err) {
      console.error("Error executing test:", err);
      return false;
    }
  }

  return true;
}
