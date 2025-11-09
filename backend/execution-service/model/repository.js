import vm from "vm";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs/promises";

const PYTHON_BIN = process.env.PYTHON_BIN || (process.platform === "win32" ? "py" : "python3");
const JAVA_BIN = process.env.JAVA_BIN || "java";
const JAVAC_BIN = process.env.JAVAC_BIN || "javac";

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// JS
function extractJsFunctionName(code) {
  const m = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
  if (!m) throw new Error("No function found in user code");
  return m[1];
}

async function executeJS(code, testCases, timeout) {
  const functionName = extractJsFunctionName(code);
  const results = [];

  for (const tc of testCases) {
    try {
      const sandbox = { args: tc.args, output: null, console: { log: () => {} } };
      const script = new vm.Script(`
        ${code}
        output = Array.isArray(args) ? ${functionName}(...args) : ${functionName}(args);
      `);
      const context = vm.createContext(sandbox);

      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Time limit exceeded")), timeout);
        try {
          script.runInContext(context);
          clearTimeout(timer);
          resolve(sandbox.output);
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });

      results.push({ ...tc, output: result, result: deepEqual(result, tc.expected), error: null });
    } catch (err) {
      results.push({ ...tc, output: null, result: false, error: err?.message || "Runtime error" });
    }
  }
  return results;
}

// Python
function extractPyFunctionName(code) {
  const m = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  if (!m) throw new Error("No function found in user code");
  return m[1];
}

async function runOnePythonCase(code, functionName, args, timeout) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "execpy-"));
  const file = path.join(dir, "prog.py");

  const harness = `
import json, sys

# --- user code start ---
${code}
# --- user code end ---

def __call_user(args):
    if isinstance(args, list):
        return ${functionName}(*args)
    else:
        return ${functionName}(args)

def main():
    try:
        raw = sys.argv[1]
        args = json.loads(raw)
        out = __call_user(args)
        print(json.dumps({"ok": True, "out": out}, separators=(",",":")))
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, separators=(",",":")))

if __name__ == "__main__":
    main()
`.trimStart();

  await fs.writeFile(file, harness, "utf-8");

  return new Promise((resolve) => {
    const baseArgs = process.platform === "win32" && PYTHON_BIN === "py" ? ["-3"] : [];
    const proc = spawn(PYTHON_BIN, [...baseArgs, file, JSON.stringify(args)], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "", stderr = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { proc.kill(); } catch {} }, timeout);

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", async () => {
      clearTimeout(timer);
      try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
      if (timedOut) return resolve({ ok: false, timeout: true, error: "Time limit exceeded" });

      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        if (parsed && parsed.ok) return resolve({ ok: true, out: parsed.out });
        return resolve({ ok: false, error: parsed?.error || (stderr.trim() || "Runtime error") });
      } catch {
        return resolve({ ok: false, error: stderr.trim() || "Runtime error" });
      }
    });
  });
}

async function executePython(code, testCases, timeout) {
  const functionName = extractPyFunctionName(code);
  const results = [];
  for (const tc of testCases) {
    const r = await runOnePythonCase(code, functionName, tc.args, timeout);
    results.push(
      r.ok
        ? { ...tc, output: r.out, result: deepEqual(r.out, tc.expected), error: null }
        : { ...tc, output: null, result: false, error: r.timeout ? "Time limit exceeded" : (r.error || "Runtime error") }
    );
  }
  return results;
}

// Java
function extractJavaMethodName(code) {
  const m = code.match(/public\s+static\s+[^\s]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  if (!m) throw new Error("Java: no public static method found in user code");
  return m[1];
}

function escapeJavaString(s) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\b/g, "\\b")
    .replace(/\f/g, "\\f")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
function escapeJavaChar(c) {
  if (c === "\\") return "\\\\";
  if (c === "'") return "\\'";
  if (c === "\n") return "\\n";
  if (c === "\r") return "\\r";
  if (c === "\t") return "\\t";
  return c;
}

function toJavaExpr(v) {
  if (v === null || v === undefined) return "null";

  if (Array.isArray(v)) {
    if (v.length === 0) return "new Object[]{}";
    const first = v[0];

    if (Array.isArray(first)) {
      // 2D numbers -> int[][]
      if (
        v.every(row => Array.isArray(row) && row.every(n => typeof n === "number"))
      ) {
        const rows = v.map(row => `new int[]{${row.map(n => Math.trunc(n)).join(",")}}`);
        return `new int[][]{${rows.join(",")}}`;
      }

      if (
        v.every(row => Array.isArray(row) && row.every(s => typeof s === "string" && s.length === 1))
      ) {
        const rows = v.map(row => `new char[]{${row.map(s => `'${escapeJavaChar(s)}'`).join(",")}}`);
        return `new char[][]{${rows.join(",")}}`;
      }

      if (
        v.every(row => Array.isArray(row) && row.every(s => typeof s === "string"))
      ) {
        const rows = v.map(row => `new String[]{${row.map(s => `"${escapeJavaString(s)}"`).join(",")}}`);
        return `new String[][]{${rows.join(",")}}`;
      }

      if (
        v.every(row => Array.isArray(row) && row.every(b => typeof b === "boolean"))
      ) {
        const rows = v.map(row => `new boolean[]{${row.map(b => (b ? "true" : "false")).join(",")}}`);
        return `new boolean[][]{${rows.join(",")}}`;
      }

      const rows = v.map(row => `new Object[]{${row.map(toJavaExpr).join(",")}}`);
      return `new Object[][]{${rows.join(",")}}`;
    }

    if (v.every(x => typeof x === "number")) {
      return `new int[]{${v.map(n => Math.trunc(n)).join(",")}}`;
    }

    if (v.every(x => typeof x === "string")) {
      if (v.every(s => s.length === 1)) {
        return `new char[]{${v.map(s => `'${escapeJavaChar(s)}'`).join(",")}}`;
      }
      return `new String[]{${v.map(s => `"${escapeJavaString(s)}"`).join(",")}}`;
    }

    if (v.every(x => typeof x === "boolean")) {
      return `new boolean[]{${v.map(b => (b ? "true" : "false")).join(",")}}`;
    }

    return `new Object[]{${v.map(toJavaExpr).join(",")}}`;
  }

  switch (typeof v) {
    case "number": return `${Math.trunc(v)}`;
    case "boolean": return v ? "true" : "false";
    case "string": return `"${escapeJavaString(v)}"`;
    default: return "null";
  }
}

async function runOneJavaCase(userCode, methodName, args, timeoutMs) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "execjava-"));
  const solutionFile   = path.join(dir, "Solution.java");
  const runnerFile     = path.join(dir, "Runner.java");
  const serializerFile = path.join(dir, "Serializer.java");

  const runnerSrc = `
public class Runner {
  public static void main(String[] a) throws Exception {
    Object out = Solution.${methodName}(${(Array.isArray(args) ? args : [args]).map(toJavaExpr).join(",")});
    System.out.print(Serializer.toJson(out));
  }
}
`.trim();

  const serializerSrc = `
import java.lang.reflect.Array;
class Serializer {
  public static String toJson(Object o) {
    if (o == null) return "null";
    Class<?> c = o.getClass();
    if (c.isArray()) {
      int n = Array.getLength(o);
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < n; i++) {
        if (i > 0) sb.append(',');
        sb.append(toJson(Array.get(o, i)));
      }
      sb.append(']');
      return sb.toString();
    }
    if (o instanceof Number || o instanceof Boolean) return o.toString();
    if (o instanceof Character) return quote(o.toString());
    if (o instanceof String) return quote((String) o);
    return quote(String.valueOf(o));
  }
  private static String quote(String s) {
    StringBuilder sb = new StringBuilder("\\"");
    for (int i = 0; i < s.length(); i++) {
      char ch = s.charAt(i);
      switch (ch) {
        case '\\\\': sb.append("\\\\\\\\"); break;
        case '\"': sb.append("\\\\\\""); break;   // <-- fixed
        case '\\b': sb.append("\\\\b"); break;
        case '\\f': sb.append("\\\\f"); break;
        case '\\n': sb.append("\\\\n"); break;
        case '\\r': sb.append("\\\\r"); break;
        case '\\t': sb.append("\\\\t"); break;
        default:
          if (ch < 32) sb.append(String.format("\\\\u%04x", (int) ch));
          else sb.append(ch);
      }
    }
    sb.append("\\"");
    return sb.toString();
  }
}
`.trim();

  await fs.writeFile(solutionFile,   userCode,     "utf-8");
  await fs.writeFile(serializerFile, serializerSrc, "utf-8");
  await fs.writeFile(runnerFile,     runnerSrc,    "utf-8");

  const compile = await new Promise((resolve) => {
    const proc = spawn(JAVAC_BIN, ["Solution.java", "Runner.java", "Serializer.java"], {
      cwd: dir, stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ code, stderr }));
  });
  if (compile.code !== 0) {
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
    return { ok: false, error: compile.stderr || "Compilation failed" };
  }

  return await new Promise(async (resolve) => {
    const proc = spawn(JAVA_BIN, ["Runner"], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; try { proc.kill(); } catch {} }, timeoutMs);

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", async () => {
      clearTimeout(timer);
      try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
      if (timedOut) return resolve({ ok: false, timeout: true, error: "Time limit exceeded" });
      if (!stdout && stderr) return resolve({ ok: false, error: stderr.trim() || "Runtime error" });
      try {
        const out = JSON.parse(stdout.trim());
        return resolve({ ok: true, out });
      } catch {
        return resolve({ ok: false, error: "Output not JSON" });
      }
    });
  });
}

async function executeJava(code, testCases, timeout) {
  const methodName = extractJavaMethodName(code);
  const results = [];
  for (const tc of testCases) {
    const r = await runOneJavaCase(code, methodName, tc.args, timeout);
    results.push(
      r.ok
        ? { ...tc, output: r.out, result: deepEqual(r.out, tc.expected), error: null }
        : { ...tc, output: null, result: false, error: r.timeout ? "Time limit exceeded" : (r.error || "Runtime error") }
    );
  }
  return results;
}

export async function executeUserCode(language, code, testCases, timeout = 1000) {
  if (language === "javascript") {
    return executeJS(code, testCases, timeout);
  }
  if (language === "python") {
    return executePython(code, testCases, timeout);
  }
  if (language === "java") {
    return executeJava(code, testCases, timeout);
  }
  throw new Error(`Unsupported language: ${language}`);
}
