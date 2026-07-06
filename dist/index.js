export { defineConduitConfig, loadConduitConfig } from "./config.js";
export { Execute as ExecuteNative, RPL, hasValue, getValue } from "./native.js";
export { Execute as ExecuteReact, RPL as RPLReact, hasValue as hasValueReact, getValue as getValueReact, useConduit, } from "./react.js";
const isNode = typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null;
let Execute;
if (isNode) {
    const nativeModule = await import("./native.js");
    Execute = nativeModule.Execute;
}
else {
    const reactModule = await import("./react.js");
    Execute = reactModule.Execute;
}
export default Execute;
