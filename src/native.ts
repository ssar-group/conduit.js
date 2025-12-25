//   _____                _       _ _         _  _____
//  / ____|              | |     (_) |       | |/ ____|
// | |     ___  _ __   __| |_   _ _| |_      | | (___
// | |    / _ \| '_ \ / _` | | | | | __| _   | |\___ \
// | |___| (_) | | | | (_| | |_| | | |_ | |__| |____) |
//  \_____\___/|_| |_|\__,_|\__,_|_|\__(_)____/|_____/
// --------(native)

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

type Boolstr = true | false | "true" | "false";
type JSON = string | number | Boolstr | JSONObject | JSONArray | null;
type Value = string | number | Boolstr;
type Status = "success" | "error" | "unknown";

/**
 * Configuration options.
 */
interface Options {
  /** Enables strict execution mode */
  strict?: boolean;

  /** Execution context or environment overrides */
  context?: Record<string, unknown>;

  /** Enables verbose logging */
  debug?: boolean;

  pythonPath?: string;
  args?: string[];
  timeoutMs?: number;
  javaPath?: string;
  rubyPath?: string;
  CPath?: string;
  CS?: string;
  cwd?: string;
}

interface JSONObject {
  [key: string]: JSON;
}

interface JSONArray extends Array<JSON> {}

interface ExecuteResult {
  status: Status;
  stdout: string;
  stderr: string;
  value?: any;
  exitCode: number;
}

interface RPLResult {
  type:
    | "null"
    | "string"
    | "boolean"
    | "number"
    | "object"
    | "array"
    | "unknown";
  raw: unknown;
  value?: Value | JSONObject | JSONArray;
}

const getScriptRoot = () => process.cwd();

/**
 * Extracts the last valid JSON value from stdout
 * Useful when scripts print multiple lines and the last one is the result
 */
function extractJsonValue(stdout: string): unknown {
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

function logDebug(enabled: boolean | undefined, ...args: unknown[]) {
  if (enabled) console.debug("[Conduit]", ...args);
}

interface LangConfig {
  cmd: string;
  getArgs: (filePath: string, extraArgs: string[]) => string[];
}

/**
 * Executes an external script (Python, Ruby, Java, C#, C) in a separate process
 * and captures its execution result.
 *
 * @async
 * @param i - Path to the script file to execute (absolute or relative).
 * @param options - Execution configuration options.
 * @returns A promise resolving to an {@link ExecuteResult} object
 *
 * @example
 * ```ts
 * const result = await Execute("script.py", {
 *   args: ["--debug"],
 *   timeoutMs: 5000
 * });
 *
 * if (result.status === "success" && result.value) {
 *   console.log("Result:", result.value);
 * }
 * ```
 */
export async function Execute(
  i: string,
  options: Options = {}
): Promise<ExecuteResult> {
  const root = options.cwd ?? getScriptRoot();
  const absolutePath = path.resolve(root, i);

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found or not accessible: ${absolutePath}`);
  }

  const ext = path.extname(absolutePath).toLowerCase();

  const languageMap: Record<string, LangConfig> = {
    ".py": {
      cmd: options.pythonPath ?? "python3",
      getArgs: (p, a) => [p, ...a],
    },
    ".rb": {
      cmd: options.rubyPath ?? "ruby",
      getArgs: (p, a) => [p, ...a],
    },
    ".java": {
      cmd: options.javaPath ?? "java",
      getArgs: (p, a) => [p, ...a],
    },
    ".cs": {
      cmd: options.CS ?? "dotnet",
      getArgs: (p, a) => ["script", p, "--", ...a],
    },
    ".c": {
      cmd: options.CPath ?? "tcc",
      getArgs: (p, a) => ["-run", p, ...a],
    },
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
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    let timeout: NodeJS.Timeout | undefined;

    if (options.timeoutMs) {
      timeout = setTimeout(() => {
        stderr += "\nProcess killed (timeout)";
        child.kill("SIGKILL");
      }, options.timeoutMs);
    }

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

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
          exitCode: code ?? -1,
        });
        return;
      }

      resolve({
        status: "success",
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        value,
        exitCode: code ?? 0,
      });
    });
  });
}

/**
 * Normalizes any value returned by an executed script into
 * a predictable, typed structure.
 *
 * @param input - Raw value extracted from stdout
 * @returns Normalized RPL result object
 *
 * @example
 * ```ts
 * const result = await Execute("script.py");
 * const normalized = RPL(result.value);
 *
 * if (normalized.type === "object") {
 *   console.log(normalized.value);
 * }
 * ```
 */
export function RPL(input: unknown): RPLResult {
  if (input === null || input === undefined) {
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
        return { type: "array", raw: input, value: input as JSONArray };
      }
      return { type: "object", raw: input, value: input as JSONObject };

    default:
      console.warn("[Conduit] Unknown RPL data type:", typeof input);
      return { type: "unknown", raw: input };
  }
}

/**
 * Helper function to check if a result has a specific value
 * Useful for conditional logic based on script output
 *
 * @example
 * ```ts
 * const result = await Execute("check.py");
 * if (hasValue(result, "success")) {
 *   console.log("Operation succeeded!");
 * }
 * ```
 */
export function hasValue(result: ExecuteResult, expected: unknown): boolean {
  return result.value === expected;
}

/**
 * Helper function to safely access nested properties in result values
 *
 * @example
 * ```ts
 * const result = await Execute("data.py");
 * const name = getValue(result, "user.name", "Unknown");
 * ```
 */
export function getValue<T = any>(
  result: ExecuteResult,
  path: string,
  defaultValue?: T
): T | undefined {
  if (!result.value || typeof result.value !== "object") {
    return defaultValue;
  }

  const keys = path.split(".");
  let current: any = result.value;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    current = current[key];
  }

  return current ?? defaultValue;
}

/**
 * Main export as default for easier imports
 */
export default Execute;
