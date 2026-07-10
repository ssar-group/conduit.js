import type { ExecuteResult, Options, RPLResult } from "./types.js";
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
export declare function getValue<T = unknown>(result: ExecuteResult, path: string, defaultValue?: T): T | undefined;
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
    execute: (scriptPath: string, options?: Options) => Promise<ExecuteResult>;
    loading: boolean;
    error: string | null;
    result: ExecuteResult | null;
    reset: () => void;
};
export default Execute;
//# sourceMappingURL=react.d.ts.map