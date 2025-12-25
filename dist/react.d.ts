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
export declare function Execute(scriptPath: string, options?: Options): Promise<ExecuteResult>;
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
export declare function RPL(input: unknown): RPLResult;
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
export declare function hasValue(result: ExecuteResult, expected: unknown): boolean;
/**
 * Helper function to safely access nested properties in result values
 *
 * @example
 * ```tsx
 * const result = await Execute("data.py");
 * const userName = getValue(result, "user.name", "Unknown");
 * ```
 */
export declare function getValue<T = any>(result: ExecuteResult, path: string, defaultValue?: T): T | undefined;
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
export declare function useConduit(): {
    execute: any;
    loading: any;
    error: any;
    result: any;
    reset: any;
};
export default Execute;
//# sourceMappingURL=react.d.ts.map