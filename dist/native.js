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
import { extractJsonValue, formatError, getValue as readValue, hasValue as compareValue, logDebug, logWarn, normalizeResultValue, } from "./utils.js";
const getScriptRoot = () => process.cwd();
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
export async function Execute(i, options = {}) {
    if (!i || typeof i !== "string") {
        throw new Error(formatError("Script path is required"));
    }
    if (options.args && !Array.isArray(options.args)) {
        throw new Error(formatError("Options args must be an array of strings"));
    }
    if (options.timeoutMs !== undefined && options.timeoutMs <= 0) {
        throw new Error(formatError("timeoutMs must be greater than 0"));
    }
    const configRoot = options.cwd ?? getScriptRoot();
    const config = await loadConduitConfig(configRoot, options);
    const resolvedOptions = mergeConduitConfig(config, options);
    const root = resolvedOptions.cwd ?? configRoot;
    const absolutePath = path.resolve(root, i);
    try {
        await fs.access(absolutePath);
    }
    catch {
        throw new Error(formatError("Script file was not found or is not readable", {
            script: i,
            resolved: absolutePath,
        }));
    }
    const ext = path.extname(absolutePath).toLowerCase();
    const languageMap = {
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
        throw new Error(formatError("Unsupported file extension", {
            extension: ext || "(none)",
            supported: Object.keys(languageMap).join(", "),
        }));
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
        let stdout = "";
        let stderr = "";
        let timeout;
        let timedOut = false;
        if (resolvedOptions.timeoutMs) {
            timeout = setTimeout(() => {
                timedOut = true;
                stderr += `\nProcess killed after ${resolvedOptions.timeoutMs}ms timeout`;
                child.kill("SIGKILL");
            }, resolvedOptions.timeoutMs);
        }
        child.stdout.on("data", (d) => (stdout += d.toString()));
        child.stderr.on("data", (d) => (stderr += d.toString()));
        child.on("error", (err) => {
            if (timeout)
                clearTimeout(timeout);
            reject(new Error(formatError("Execution failed before the script started", {
                command: langConfig.cmd,
                reason: err.message,
            })));
        });
        child.on("close", (code) => {
            if (timeout)
                clearTimeout(timeout);
            const value = extractJsonValue(stdout);
            if (code !== 0) {
                logDebug(resolvedOptions.debug, "Execution error", stderr.trim());
                resolve({
                    status: "error",
                    stdout: stdout.trim(),
                    stderr: stderr.trim() || `Process exited with code ${code}`,
                    value,
                    exitCode: timedOut ? -1 : code ?? -1,
                });
                return;
            }
            if (stderr.trim()) {
                logWarn(resolvedOptions, `Script wrote to stderr: ${stderr.trim()}`);
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
export function RPL(input) {
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
export function hasValue(result, expected) {
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
export function getValue(result, path, defaultValue) {
    return readValue(result, path, defaultValue);
}
/**
 * Main export as default for easier imports
 */
export default Execute;
