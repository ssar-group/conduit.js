export type Boolstr = true | false | "true" | "false";
export type JSON = string | number | Boolstr | JSONObject | JSONArray | null;
export type Value = string | number | Boolstr;
export type Status = "success" | "error" | "unknown";
export interface Options {
    strict?: boolean;
    context?: Record<string, unknown>;
    debug?: boolean;
    warnings?: boolean;
    pythonPath?: string;
    args?: string[];
    timeoutMs?: number;
    javaPath?: string;
    rubyPath?: string;
    CPath?: string;
    CS?: string;
    cwd?: string;
    env?: Record<string, string | undefined>;
    apiEndpoint?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}
export interface JSONObject {
    [key: string]: JSON;
}
export interface JSONArray extends Array<JSON> {
}
export interface ExecuteResult {
    status: Status;
    stdout: string;
    stderr: string;
    value?: any;
    exitCode: number;
}
export interface RPLResult {
    type: "null" | "string" | "boolean" | "number" | "object" | "array" | "unknown";
    raw: unknown;
    value?: Value | JSONObject | JSONArray;
}
export type ConduitConfig = Omit<Options, "signal">;
