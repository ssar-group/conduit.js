//   _____                _       _ _         _  _____
//  / ____|              | |     (_) |       | |/ ____|
// | |     ___  _ __   __| |_   _ _| |_      | | (___
// | |    / _ \| '_ \ / _` | | | | | __| _   | |\___ \
// | |___| (_) | | | | (_| | |_| | | |_ | |__| |____) |
//  \_____\___/|_| |_|\__,_|\__,_|_|\__(_)____/|_____/
// --------(native JavaScript)

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { loadConduitConfig, mergeConduitConfig } from "./config.js";
import type { ExecuteResult, Options, RPLResult } from "./types.js";
import {
  extractJsonValue,
  findJsonValue,
  formatError,
  getValue as readValue,
  hasValue as compareValue,
  logDebug,
  logWarn,
  normalizeResultValue,
} from "./utils.js";

const getScriptRoot = () => process.cwd();

interface LangConfig {
  cmd: string;
  getArgs: (filePath: string, extraArgs: string[]) => string[];
}

interface CapturedOutput {
  text: string;
  bytes: number;
  exceeded: boolean;
}

type OutputStreamName = "stdout" | "stderr";

function validatePositiveNumber(name: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    throw new Error(formatError(`${name} must be greater than 0`));
  }
}

function validatePositiveInteger(name: string, value: number | undefined): void {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new Error(formatError(`${name} must be a positive integer`));
  }
}

function appendOutput(
  output: CapturedOutput,
  chunk: Buffer,
  maxBytes: number | undefined,
): CapturedOutput {
  const text = chunk.toString();

  if (maxBytes === undefined) {
    return {
      text: output.text + text,
      bytes: output.bytes + Buffer.byteLength(text),
      exceeded: output.exceeded,
    };
  }

  const remaining = maxBytes - output.bytes;

  if (remaining <= 0) {
    return {
      ...output,
      exceeded: true,
    };
  }

  const bytes = Buffer.from(text);

  if (bytes.byteLength <= remaining) {
    return {
      text: output.text + text,
      bytes: output.bytes + bytes.byteLength,
      exceeded: output.exceeded,
    };
  }

  const trimmed = bytes.subarray(0, remaining).toString("utf8").replace(/\uFFFD$/, "");

  return {
    text: output.text + trimmed,
    bytes: maxBytes,
    exceeded: true,
  };
}

function joinDiagnostics(stderr: string, diagnostics: string[]): string {
  const parts = [stderr.trim(), ...diagnostics].filter(Boolean);
  return parts.join("\n");
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
  options: Options = {},
): Promise<ExecuteResult> {
  if (!i || typeof i !== "string") {
    throw new Error(formatError("Script path is required"));
  }

  if (options.args && (!Array.isArray(options.args) || options.args.some((arg) => typeof arg !== "string"))) {
    throw new Error(formatError("Options args must be an array of strings"));
  }

  validatePositiveNumber("timeoutMs", options.timeoutMs);
  validatePositiveInteger("maxStdoutBytes", options.maxStdoutBytes);
  validatePositiveInteger("maxStderrBytes", options.maxStderrBytes);

  const configRoot = options.cwd ?? getScriptRoot();
  const config = await loadConduitConfig(configRoot, options);
  const resolvedOptions = mergeConduitConfig(config, options);
  const root = resolvedOptions.cwd ?? configRoot;
  const absolutePath = path.resolve(root, i);

  if (resolvedOptions.signal?.aborted) {
    return {
      status: "error",
      stdout: "",
      stderr: "Execution aborted before the script started",
      exitCode: -1,
    };
  }

  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(
      formatError("Script file was not found or is not readable", {
        script: i,
        resolved: absolutePath,
      }),
    );
  }

  const ext = path.extname(absolutePath).toLowerCase();

  const languageMap: Record<string, LangConfig> = {
    ".py": {
      cmd: resolvedOptions.pythonPath ?? "python3",
      getArgs: (p, a) => [p, ...a],
    },
    ".rb": {
      cmd: resolvedOptions.rubyPath ?? "ruby",
      getArgs: (p, a) => [p, ...a],
    },
    ".java": {
      cmd: resolvedOptions.javaPath ?? "java",
      getArgs: (p, a) => [p, ...a],
    },
    ".cs": {
      cmd: resolvedOptions.CS ?? "dotnet",
      getArgs: (p, a) => ["script", p, "--", ...a],
    },
    ".c": {
      cmd: resolvedOptions.CPath ?? "tcc",
      getArgs: (p, a) => ["-run", p, ...a],
    },
  };

  const langConfig = languageMap[ext];
  if (!langConfig) {
    throw new Error(
      formatError("Unsupported file extension", {
        extension: ext || "(none)",
        supported: Object.keys(languageMap).join(", "),
      }),
    );
  }

  logDebug(resolvedOptions.debug, "Executing", langConfig.cmd, absolutePath);

  return new Promise((resolve, reject) => {
    const args = langConfig.getArgs(absolutePath, resolvedOptions.args ?? []);
    const env = {
      ...process.env,
      ...resolvedOptions.env,
      ...(resolvedOptions.context
        ? { CONDUIT_CONTEXT: JSON.stringify(resolvedOptions.context) }
        : {}),
    };
    const child = spawn(langConfig.cmd, args, {
      cwd: root,
      env,
    });

    let stdout: CapturedOutput = { text: "", bytes: 0, exceeded: false };
    let stderr: CapturedOutput = { text: "", bytes: 0, exceeded: false };
    let timeout: NodeJS.Timeout | undefined;
    let abortKillTimeout: NodeJS.Timeout | undefined;
    let timedOut = false;
    let aborted = false;
    let limitExceeded: OutputStreamName | undefined;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (abortKillTimeout) clearTimeout(abortKillTimeout);
      resolvedOptions.signal?.removeEventListener("abort", abortHandler);
    };

    const killProcess = (signal: NodeJS.Signals) => {
      if (!child.killed) {
        child.kill(signal);
      }
    };

    const stopForOutputLimit = (stream: OutputStreamName) => {
      if (limitExceeded) return;

      limitExceeded = stream;
      killProcess("SIGKILL");
    };

    const abortHandler = () => {
      if (aborted) return;

      aborted = true;
      killProcess("SIGTERM");
      abortKillTimeout = setTimeout(() => {
        killProcess("SIGKILL");
      }, 1000);
    };

    if (resolvedOptions.timeoutMs) {
      timeout = setTimeout(() => {
        timedOut = true;
        killProcess("SIGKILL");
      }, resolvedOptions.timeoutMs);
    }

    resolvedOptions.signal?.addEventListener("abort", abortHandler, { once: true });

    child.stdout.on("data", (data: Buffer) => {
      stdout = appendOutput(stdout, data, resolvedOptions.maxStdoutBytes);
      if (stdout.exceeded) {
        stopForOutputLimit("stdout");
      }
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr = appendOutput(stderr, data, resolvedOptions.maxStderrBytes);
      if (stderr.exceeded) {
        stopForOutputLimit("stderr");
      }
    });

    child.on("error", (err) => {
      cleanup();
      reject(
        new Error(
          formatError("Execution failed before the script started", {
            command: langConfig.cmd,
            reason: err.message,
          }),
        ),
      );
    });

    child.on("close", (code) => {
      cleanup();

      const stdoutText = stdout.text.trim();
      const stderrText = stderr.text.trim();
      const parsed = findJsonValue(stdoutText);
      const diagnostics: string[] = [];

      if (timedOut) {
        diagnostics.push(`Process killed after ${resolvedOptions.timeoutMs}ms timeout`);
      }

      if (aborted) {
        diagnostics.push("Execution aborted");
      }

      if (limitExceeded) {
        const optionName = limitExceeded === "stdout" ? "maxStdoutBytes" : "maxStderrBytes";
        const limit = limitExceeded === "stdout"
          ? resolvedOptions.maxStdoutBytes
          : resolvedOptions.maxStderrBytes;

        diagnostics.push(`${limitExceeded} exceeded ${optionName} limit of ${limit} bytes`);
      }

      const stderrWithDiagnostics = joinDiagnostics(stderrText, diagnostics);
      const value = parsed.value;

      if (code !== 0 || timedOut || aborted || limitExceeded) {
        logDebug(resolvedOptions.debug, "Execution error", stderrWithDiagnostics);
        resolve({
          status: "error",
          stdout: stdoutText,
          stderr: stderrWithDiagnostics || `Process exited with code ${code}`,
          value,
          exitCode: timedOut || aborted || limitExceeded ? -1 : code ?? -1,
        });
        return;
      }

      if (resolvedOptions.strict && stderrText) {
        resolve({
          status: "error",
          stdout: stdoutText,
          stderr: `Strict mode failed because the script wrote to stderr:\n${stderrText}`,
          value,
          exitCode: code ?? 0,
        });
        return;
      }

      if (resolvedOptions.strict && !parsed.found) {
        resolve({
          status: "error",
          stdout: stdoutText,
          stderr: "Strict mode failed because stdout did not contain a JSON value",
          value,
          exitCode: code ?? 0,
        });
        return;
      }

      if (stderrText) {
        logWarn(resolvedOptions, `Script wrote to stderr: ${stderrText}`);
      }

      resolve({
        status: "success",
        stdout: stdoutText,
        stderr: stderrText,
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
  const normalized = normalizeResultValue(input);
  if (normalized.type === "unknown") {
    logWarn({}, `Unknown RPL data type: ${typeof input}`);
  }
  return normalized;
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
  return compareValue(result, expected);
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
export function getValue<T = unknown>(
  result: ExecuteResult,
  path: string,
  defaultValue?: T,
): T | undefined {
  return readValue(result, path, defaultValue);
}

/**
 * Main export as default for easier imports
 */
export default Execute;
