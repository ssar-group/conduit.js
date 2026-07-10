import type { ExecuteResult, Options, RPLResult } from "./types.js";
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
export declare function getValue<T = unknown>(result: ExecuteResult, path: string, defaultValue?: T): T | undefined;
/**
 * Main export as default for easier imports
 */
export default Execute;
//# sourceMappingURL=native.d.ts.map