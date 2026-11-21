import type { ConduitConfig, Options } from "./types.js";
export declare function defineConduitConfig(config: ConduitConfig): ConduitConfig;
export declare function loadConduitConfig(cwd?: string, options?: Pick<ConduitConfig, "debug" | "warnings">): Promise<ConduitConfig>;
/** Clear the cached config for a directory, or clear all cached configs. */
export declare function clearConduitConfigCache(cwd?: string): void;
export declare function mergeConduitConfig(config: ConduitConfig, options: Options): Options;
//# sourceMappingURL=config.d.ts.map