//   _____                _       _ _         _  _____
//  / ____|              | |     (_) |       | |/ ____|
// | |     ___  _ __   __| |_   _ _| |_      | | (___
// | |    / _ \| '_ \ / _` | | | | | __| _   | |\___ \
// | |___| (_) | | | | (_| | |_| | | |_ | |__| |____) |
//  \_____\___/|_| |_|\__,_|\__,_|_|\__(_)____/|_____/
// --------(react)

import { useState, useCallback } from "react";

type Boolstr = true | false | "true" | "false";
type JSON = string | number | Boolstr | JSONObject | JSONArray | null;
type Value = string | number | Boolstr;
type Status = "success" | "error" | "unknown";

/**
 * Configuration options for browser execution.
 */
interface Options {
  /** Enables strict execution mode */
  strict?: boolean;

  /** Execution context or environment overrides */
  context?: Record<string, unknown>;

  /** Enables verbose logging */
  debug?: boolean;

  /** API endpoint URL for script execution */
  apiEndpoint?: string;

  /** Additional headers for API requests */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** Arguments to pass to the script */
  args?: string[];

  /** Abort signal for cancellation */
  signal?: AbortSignal;
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

/**
 * Extracts the last valid JSON value from stdout
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

  logDebug(options.debug, "Executing", scriptPath, "via", apiEndpoint);

  try {
    const controller = new AbortController();
    const timeoutId = options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : null;

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
      }),
      signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Parse value if present
    const value =
      data.value !== undefined
        ? data.value
        : extractJsonValue(data.stdout || "");

    return {
      status: data.status || "success",
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      value,
      exitCode: data.exitCode ?? 0,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      logDebug(options.debug, "Request aborted");
      return {
        status: "error",
        stdout: "",
        stderr: "Request aborted (timeout or cancelled)",
        exitCode: -1,
      };
    }

    logDebug(options.debug, "Execution error", error);
    return {
      status: "error",
      stdout: "",
      stderr: error.message || String(error),
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
  return result.value === expected;
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
    } catch (err: any) {
      const errorMsg = err.message || String(err);
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
