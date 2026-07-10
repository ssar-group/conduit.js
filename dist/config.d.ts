import type { ConduitConfig, Options } from "./types.js";
export declare function defineConduitConfig(config: ConduitConfig): ConduitConfig;
export declare function loadConduitConfig(cwd?: string, options?: Pick<ConduitConfig, "debug" | "warnings">): Promise<ConduitConfig>;
export declare function mergeConduitConfig(config: ConduitConfig, options: Options): Options;
//# sourceMappingURL=config.d.ts.map