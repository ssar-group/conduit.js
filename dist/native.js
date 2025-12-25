// src/native.ts
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
var getScriptRoot = () => process.cwd();
function extractJsonValue(stdout) {
  const lines = stdout.trim().split("\n").reverse();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      continue;
    }
  }
  return null;
}
function logDebug(enabled, ...args) {
  if (enabled) console.debug("[Conduit]", ...args);
}
async function Execute(i, options = {}) {
  const root = options.cwd ?? getScriptRoot();
  const absolutePath = path.resolve(root, i);
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found or not accessible: ${absolutePath}`);
  }
  const ext = path.extname(absolutePath).toLowerCase();
  const languageMap = {
    ".py": {
      cmd: options.pythonPath ?? "python3",
      getArgs: (p, a) => [p, ...a]
    },
    ".rb": {
      cmd: options.rubyPath ?? "ruby",
      getArgs: (p, a) => [p, ...a]
    },
    ".java": {
      cmd: options.javaPath ?? "java",
      getArgs: (p, a) => [p, ...a]
    },
    ".cs": {
      cmd: options.CS ?? "dotnet",
      getArgs: (p, a) => ["script", p, "--", ...a]
    },
    ".c": {
      cmd: options.CPath ?? "tcc",
      getArgs: (p, a) => ["-run", p, ...a]
    }
  };
  const langConfig = languageMap[ext];
  if (!langConfig) {
    throw new Error(`Unsupported file extension: ${ext}`);
  }
  logDebug(options.debug, "Executing", langConfig.cmd, absolutePath);
  return new Promise((resolve, reject) => {
    const args = langConfig.getArgs(absolutePath, options.args ?? []);
    const child = spawn(langConfig.cmd, args, {
      cwd: root,
      env: process.env
    });
    let stdout = "";
    let stderr = "";
    let timeout;
    if (options.timeoutMs) {
      timeout = setTimeout(() => {
        stderr += "\nProcess killed (timeout)";
        child.kill("SIGKILL");
      }, options.timeoutMs);
    }
    child.stdout.on("data", (d) => stdout += d.toString());
    child.stderr.on("data", (d) => stderr += d.toString());
    child.on("error", (err) => {
      if (timeout) clearTimeout(timeout);
      reject(new Error(`Execution failed: ${err.message}`));
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      const value = extractJsonValue(stdout);
      if (code !== 0) {
        logDebug(options.debug, "Execution error", stderr);
        resolve({
          status: "error",
          stdout: stdout.trim(),
          stderr: stderr.trim() || `Exited with code ${code}`,
          value,
          exitCode: code ?? -1
        });
        return;
      }
      resolve({
        status: "success",
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        value,
        exitCode: code ?? 0
      });
    });
  });
}
function RPL(input) {
  if (input === null || input === void 0) {
    return { type: "null", raw: input };
  }
  switch (typeof input) {
    case "string":
      return { type: "string", raw: input, value: input };
    case "boolean":
      return { type: "boolean", raw: input, value: input };
    case "number":
      return { type: "number", raw: input, value: input };
    case "object":
      if (Array.isArray(input)) {
        return { type: "array", raw: input, value: input };
      }
      return { type: "object", raw: input, value: input };
    default:
      console.warn("[Conduit] Unknown RPL data type:", typeof input);
      return { type: "unknown", raw: input };
  }
}
function hasValue(result, expected) {
  return result.value === expected;
}
function getValue(result, path2, defaultValue) {
  if (!result.value || typeof result.value !== "object") {
    return defaultValue;
  }
  const keys = path2.split(".");
  let current = result.value;
  for (const key of keys) {
    if (current === null || current === void 0) {
      return defaultValue;
    }
    current = current[key];
  }
  return current ?? defaultValue;
}
var native_default = Execute;
export {
  Execute,
  RPL,
  native_default as default,
  getValue,
  hasValue
};
