//   _____                _       _ _         _  _____
//  / ____|              | |     (_) |       | |/ ____|
// | |     ___  _ __   __| |_   _ _| |_      | | (___
// | |    / _ \| '_ \ / _` | | | | | __| _   | |\___ \
// | |___| (_) | | | | (_| | |_| | | |_ | |__| |____) |
//  \_____\___/|_| |_|\__,_|\__,_|_|\__(_)____/|_____/
// --------(react)

import { useState, useCallback } from "react";
import type { ExecuteResult, Options, RPLResult, Status } from "./types.js";
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

/**
 * Executes a script via API endpoint (for browser/React environments).
 *
 * This function sends the script path and options to a backend API
 * that will execute the script server-side and return the results.
 *
 * @async
 * @param scriptPath - Path to the script file to execute
 * @param options - Execution configuration options
 * @returns A promise resolving to an {@link ExecuteResult} object
 *
 * @example
 * ```tsx
 * // In React component
 * const MyComponent = () => {
 *   const [result, setResult] = useState(null);
 *
 *   const runScript = async () => {
 *     const res = await Execute("scripts/process.py", {
 *       apiEndpoint: "/api/execute",
 *       args: ["--mode", "production"]
 *     });
 *     setResult(res);
 *   };
 *
 *   return <button onClick={runScript}>Run</button>;
 * };
 * ```
 */
export async function Execute(
  scriptPath: string,
  options: Options = {}
): Promise<ExecuteResult> {
  const apiEndpoint = options.apiEndpoint || "/api/conduit/execute";

  if (!scriptPath || typeof scriptPath !== "string") {
    return {
      status: "error",
      stdout: "",
      stderr: formatError("Script path is required"),
      exitCode: -1,
    };
  }

  if (options.timeoutMs !== undefined && (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0)) {
    return {
      status: "error",
      stdout: "",
      stderr: formatError("timeoutMs must be greater than 0"),
      exitCode: -1,
    };
  }

  if (options.args && (!Array.isArray(options.args) || options.args.some((arg) => typeof arg !== "string"))) {
    return {
      status: "error",
      stdout: "",
      stderr: formatError("Options args must be an array of strings"),
      exitCode: -1,
    };
  }

  if (options.maxStdoutBytes !== undefined && (!Number.isSafeInteger(options.maxStdoutBytes) || options.maxStdoutBytes <= 0)) {
    return {
      status: "error",
      stdout: "",
      stderr: formatError("maxStdoutBytes must be a positive integer"),
      exitCode: -1,
    };
  }

  if (options.maxStderrBytes !== undefined && (!Number.isSafeInteger(options.maxStderrBytes) || options.maxStderrBytes <= 0)) {
    return {
      status: "error",
      stdout: "",
      stderr: formatError("maxStderrBytes must be a positive integer"),
      exitCode: -1,
    };
  }

  logDebug(options.debug, "Executing", scriptPath, "via", apiEndpoint);

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const controller = new AbortController();
    timeoutId = options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : undefined;

    const signal = options.signal || controller.signal;

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify({
        scriptPath,
        args: options.args || [],
        context: options.context,
        strict: options.strict,
        debug: options.debug,
        maxStdoutBytes: options.maxStdoutBytes,
        maxStderrBytes: options.maxStderrBytes,
      }),
      signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        formatError("API request failed", {
          status: response.status,
          statusText: response.statusText,
          body: errorText.slice(0, 500),
        }),
      );
    }

    const data = await response.json() as Partial<ExecuteResult>;
    const stdout = typeof data.stdout === "string" ? data.stdout : "";
    const stderr = typeof data.stderr === "string" ? data.stderr : "";
    const parsed = findJsonValue(stdout);

    // Parse value if present
    const value =
      data.value !== undefined
        ? data.value
        : extractJsonValue(stdout);

    const result = {
      status: data.status || "success",
      stdout,
      stderr,
      value,
      exitCode: data.exitCode ?? 0,
    };

    if (options.strict && result.status === "success" && result.stderr) {
      return {
        ...result,
        status: "error",
        stderr: `Strict mode failed because the API returned stderr:\n${result.stderr}`,
      };
    }

    if (options.strict && result.status === "success" && data.value === undefined && !parsed.found) {
      return {
        ...result,
        status: "error",
        stderr: "Strict mode failed because the API response did not contain a JSON value",
      };
    }

    if (result.status === "success" && result.stderr) {
      logWarn(options, `API returned stderr: ${result.stderr}`);
    }

    return result;
  } catch (error: unknown) {
    if (timeoutId) clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      logDebug(options.debug, "Request aborted");
      return {
        status: "error",
        stdout: "",
        stderr: options.timeoutMs
          ? `Request aborted after ${options.timeoutMs}ms timeout`
          : "Request aborted",
        exitCode: -1,
      };
    }

    logDebug(options.debug, "Execution error", error);
    return {
      status: "error",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
    };
  }
}

/**
 * Normalizes any value returned by an executed script into
 * a predictable, typed structure.
 *
 * @param input - Raw value extracted from stdout
 * @returns Normalized RPL result object
 *
 * @example
 * ```tsx
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
 *
 * @example
 * ```tsx
 * const result = await Execute("check.py");
 * if (hasValue(result, "success")) {
 *   toast.success("Operation succeeded!");
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
 * ```tsx
 * const result = await Execute("data.py");
 * const userName = getValue(result, "user.name", "Unknown");
 * ```
 */
export function getValue<T = unknown>(
  result: ExecuteResult,
  path: string,
  defaultValue?: T
): T | undefined {
  return readValue(result, path, defaultValue);
}

/**
 * React Hook for executing scripts with loading/error states
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { execute, loading, error, result } = useConduit();
 *
 *   return (
 *     <div>
 *       <button
 *         onClick={() => execute("script.py")}
 *         disabled={loading}
 *       >
 *         {loading ? "Running..." : "Run Script"}
 *       </button>
 *       {error && <p>Error: {error}</p>}
 *       {result && <pre>{JSON.stringify(result.value, null, 2)}</pre>}
 *     </div>
 *   );
 * };
 * ```
 */
export function useConduit() {
  if (typeof window === "undefined") {
    throw new Error("useConduit can only be used in browser environments");
  }

  if (!useState || !useCallback) {
    throw new Error("React hooks not found. Make sure React is loaded.");
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecuteResult | null>(null);

  const execute = useCallback(async (scriptPath: string, options?: Options) => {
    setLoading(true);
    setError(null);

    try {
      const res = await Execute(scriptPath, options);
      setResult(res);

      if (res.status === "error") {
        setError(res.stderr);
      }

      return res;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      return {
        status: "error" as Status,
        stdout: "",
        stderr: errorMsg,
        exitCode: -1,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return { execute, loading, error, result, reset };
}

export default Execute;
