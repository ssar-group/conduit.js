import type { ExecuteResult, Options, RPLResult } from "./types.js";
export declare function logDebug(enabled: boolean | undefined, ...args: unknown[]): void;
export declare function logWarn(options: Pick<Options, "warnings" | "debug">, message: string): void;
export declare function formatError(message: string, details?: Record<string, unknown>): string;
export declare function isPlainObject(input: unknown): input is Record<string, unknown>;
export declare function extractJsonValue(stdout: string): unknown;
export declare function normalizeResultValue(input: unknown): RPLResult;
export declare function hasValue(result: ExecuteResult, expected: unknown): boolean;
export declare function getValue<T = unknown>(result: ExecuteResult, path: string, defaultValue?: T): T | undefined;
