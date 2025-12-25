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
interface JSONArray extends Array<JSON> {
}
interface ExecuteResult {
    status: Status;
    stdout: string;
    stderr: string;
    value?: any;
    exitCode: number;
}
interface RPLResult {
    type: "null" | "string" | "boolean" | "number" | "object" | "array" | "unknown";
    raw: unknown;
    value?: Value | JSONObject | JSONArray;
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
export declare function Execute(i: string, options?: Options): Promise<ExecuteResult>;
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
export declare function RPL(input: unknown): RPLResult;
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
export declare function hasValue(result: ExecuteResult, expected: unknown): boolean;
/**
 * Helper function to safely access nested properties in result values
 *
 * @example
 * ```ts
 * const result = await Execute("data.py");
 * const name = getValue(result, "user.name", "Unknown");
 * ```
 */
export declare function getValue<T = any>(result: ExecuteResult, path: string, defaultValue?: T): T | undefined;
/**
 * Main export as default for easier imports
 */
export default Execute;
//# sourceMappingURL=native.d.ts.map