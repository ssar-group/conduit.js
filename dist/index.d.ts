export { defineConduitConfig, loadConduitConfig } from "./config.js";
export { Execute as ExecuteNative, RPL, hasValue, getValue } from "./native.js";
export { Execute as ExecuteReact, RPL as RPLReact, hasValue as hasValueReact, getValue as getValueReact, useConduit, } from "./react.js";
import type { ExecuteResult, Options } from "./types.js";
type ExecuteFunction = (scriptPath: string, options?: Options) => Promise<ExecuteResult>;
declare let Execute: ExecuteFunction;
export default Execute;
export type { ConduitConfig, Options, ExecuteResult, RPLResult, Status, } from "./types.js";
//# sourceMappingURL=index.d.ts.map