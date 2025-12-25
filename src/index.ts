export { Execute as ExecuteNative, RPL, hasValue, getValue } from "./native";

export {
  Execute as ExecuteReact,
  RPL as RPLReact,
  hasValue as hasValueReact,
  getValue as getValueReact,
  useConduit,
} from "./react";

const isNode =
  typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;

if (isNode) {
  const { Execute } = require("./native");
  module.exports = Execute;
  module.exports.default = Execute;
} else {
  const { Execute } = require("./react");
  module.exports = Execute;
  module.exports.default = Execute;
}

export type { Options, ExecuteResult, RPLResult, Status } from "./types";
