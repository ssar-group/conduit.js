# Conduit.JS - Multi-Language Execution Interface

![](https://img.shields.io/badge/Version%201.1.0-000000?style=flat-square&logo=github)
![](<https://img.shields.io/badge/JavaScript%20(Build%20TS)-000000?style=flat-square&logo=javascript&logoColor=white>)

## Overview

**Conduit.js** is a high-level orchestration library designed to bridge the gap between JavaScript environments and external programming runtimes. It allows developers to execute, manage, and facilitate communication with scripts written in languages such as Python or Java, directly from a JavaScript or TypeScript codebase.

By providing a unified abstraction layer over system processes, Conduit.js handles the complexities of inter-process communication (IPC). It ensures that data exchange remains structured, execution lifecycles are predictable, and error reporting is consistent across different runtimes including Node.js, Bun, and Deno.

## Installation

Conduit.js can be integrated into your project using standard package managers or via the SSAR DevKit for ecosystem-aligned environments.

### Standard Installation

Choose the command corresponding to your preferred package manager:

```Bash
# Using npm
npm install @ssar-group/conduit.js

# Using pnpm
pnpm add @ssar-group/conduit.js

# Using yarn
yarn add @ssar-group/conduit.js
```

### SSAR Ecosystem Installation

For projects managed within the SSAR environment, use the [DevKit CLI (using opm)](https://github.com/ssar-group/opm):

```Bash
opm devkit
> conduit.js
```

## Quick Usage

```ts
import Execute, { getValue } from "@ssar-group/conduit.js";

const result = await Execute("scripts/hello.py", {
  args: ["World"],
  timeoutMs: 5000,
});

if (result.status === "error") {
  console.error(result.stderr);
}

console.log(getValue(result, "greeting"));
```

## Configuration

Conduit.js looks for a config file in your project root before each run. Per-call options still win over config values.

Supported files:

- `conduit.config.json`
- `conduit.config.js`
- `conduit.config.mjs`

```js
// conduit.config.mjs
import { defineConduitConfig } from "@ssar-group/conduit.js/config";

export default defineConduitConfig({
  pythonPath: "python3",
  rubyPath: "ruby",
  timeoutMs: 5000,
  debug: false,
  warnings: true,
  env: {
    NODE_ENV: "development",
  },
});
```

The package also includes `conduit-config.d.ts` for typing config values when you want editor support.

## Contributing

We welcome contributions to the **Conduit.js** project through several channels:

- **Reporting**: Submit bug reports or feature requests via the [Issue Tracker](https://github.com/ssar-group/conduit.js/issues).

- **Development**: Propose source code modifications through [Pull Requests](https://github.com/ssar-group/conduit.js/pulls).

- **Documentation**: Assist in refining the technical documentation and usage guides.

## Code of Conduct

This project adheres to the [SSAR Open Source Code of Conduct](https://docs.ssar-group.com/opensource/code-of-conduct?ver=3). Maintenance of a professional and respectful environment is mandatory for all contributors.

For formal inquiries, please contact the maintainers at: [contactus@ssar-group.com](mailto:contactus@ssar-group.com)
