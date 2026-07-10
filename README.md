<div align="center">

# Conduit.js

**Run Python, Ruby, Java, C#, and C scripts from JavaScript with one simple result object.**

[![npm version](https://img.shields.io/npm/v/@ssar-group/conduit.js.svg)](https://www.npmjs.com/package/@ssar-group/conduit.js)
[![npm downloads](https://img.shields.io/npm/dm/@ssar-group/conduit.js.svg)](https://www.npmjs.com/package/@ssar-group/conduit.js)
[![status](https://img.shields.io/badge/status-active-44cc11.svg)](#repository-status)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ssar-group/conduit.js/pulls)

</div>

---

Conduit.js is a small bridge between Node.js and scripts written in other languages.

Use it when a JavaScript app needs to run a local script, pass arguments, capture stdout/stderr, and read a JSON result without writing the same `child_process` wrapper again and again.

It also includes a React/browser entrypoint. The browser cannot run local scripts by itself, so that entrypoint sends the request to your own backend API.

## Contents

- [Install](#install)
- [Quick Start](#quick-start)
- [How Output Is Parsed](#how-output-is-parsed)
- [Options](#options)
- [Config](#config)
- [React and Browser](#react-and-browser)
- [Helpers](#helpers)
- [Development](#development)
- [Contributing](#contributing)

## Install

```bash
npm install @ssar-group/conduit.js
```

```bash
pnpm add @ssar-group/conduit.js
```

```bash
yarn add @ssar-group/conduit.js
```

## Quick Start

```ts
import Execute, { getValue } from "@ssar-group/conduit.js";

const result = await Execute("scripts/hello.py", {
  args: ["World"],
  timeoutMs: 5000,
});

if (result.status === "error") {
  console.error(result.stderr);
  process.exitCode = 1;
}

console.log(getValue(result, "greeting"));
```

```py
# scripts/hello.py
import json
import sys

name = sys.argv[1] if len(sys.argv) > 1 else "World"

print(f"Hello, {name}")
print(json.dumps({
    "greeting": f"Hello, {name}",
    "status": "success"
}))
```

Conduit keeps the full stdout/stderr text, then parses the last valid JSON line from stdout as `result.value`.

## How Output Is Parsed

Every execution returns the same shape:

```ts
interface ExecuteResult {
  status: "success" | "error" | "unknown";
  stdout: string;
  stderr: string;
  value?: unknown;
  exitCode: number;
}
```

If stdout contains logs and then JSON, Conduit uses the JSON line:

```txt
Starting report...
Loaded 12 rows
{"ok":true,"count":12}
```

In that case, `result.stdout` still contains all three lines, and `result.value` is:

```json
{
  "ok": true,
  "count": 12
}
```

Supported file types:

| Extension | Default command                   |
| --------- | --------------------------------- |
| `.py`     | `python3`                         |
| `.rb`     | `ruby`                            |
| `.java`   | `java`                            |
| `.cs`     | `dotnet script <file> -- ...args` |
| `.c`      | `tcc -run <file> ...args`         |

You can change the runner per call:

```ts
await Execute("task.py", {
  pythonPath: "/usr/bin/python3",
});
```

## Options

```ts
await Execute("scripts/task.py", {
  args: ["--mode", "safe"],
  cwd: process.cwd(),
  timeoutMs: 10_000,
  strict: true,
  maxStdoutBytes: 1024 * 1024,
  maxStderrBytes: 256 * 1024,
  context: {
    requestId: "req_123",
  },
  env: {
    FEATURE_FLAG: "on",
  },
});
```

| Option           | What it does                                                  |
| ---------------- | ------------------------------------------------------------- |
| `args`           | Arguments passed after the script path.                       |
| `cwd`            | Directory used to resolve the script and config file.         |
| `timeoutMs`      | Stops the process after this many milliseconds.               |
| `strict`         | Turns stderr or missing JSON output into an error result.     |
| `maxStdoutBytes` | Stops the process if stdout grows past this many bytes.       |
| `maxStderrBytes` | Stops the process if stderr grows past this many bytes.       |
| `context`        | Sent to the child process as `CONDUIT_CONTEXT` JSON.          |
| `env`            | Extra environment variables for the child process.            |
| `signal`         | AbortSignal used to stop a running native process.            |

When `timeoutMs`, `signal`, or an output limit stops the process, Conduit returns `status: "error"` and explains the reason in `stderr`.

### Strict Mode

Use strict mode when the script is part of a workflow and should produce a clean JSON result.

```ts
const result = await Execute("scripts/report.py", {
  strict: true,
});
```

With `strict: true`, Conduit returns an error result when:

- the process exits with a non-zero code
- the script writes to stderr
- stdout does not contain a JSON value
- a timeout, abort, or output limit stops the process

## Config

Conduit looks for a config file in `cwd`. Per-call options override config values.

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
  maxStdoutBytes: 1024 * 1024,
  maxStderrBytes: 256 * 1024,
  warnings: true,
  env: {
    NODE_ENV: "development",
  },
});
```

The package also includes `conduit-config.d.ts` for editor support in config files.

## React and Browser

Import from the React entrypoint when you are in the browser:

```tsx
import { useConduit } from "@ssar-group/conduit.js/react";

export function RunReportButton() {
  const { execute, loading, error, result } = useConduit();

  return (
    <>
      <button
        disabled={loading}
        onClick={() =>
          execute("scripts/report.py", {
            apiEndpoint: "/api/conduit/execute",
            strict: true,
            maxStdoutBytes: 1024 * 1024,
          })
        }
      >
        {loading ? "Running" : "Run report"}
      </button>

      {error ? <p>{error}</p> : null}
      {result ? <pre>{JSON.stringify(result.value, null, 2)}</pre> : null}
    </>
  );
}
```

Your backend endpoint should accept a POST body like this:

```json
{
  "scriptPath": "scripts/report.py",
  "args": [],
  "context": {},
  "strict": true,
  "debug": false,
  "maxStdoutBytes": 1048576,
  "maxStderrBytes": 262144
}
```

and return an `ExecuteResult`.

## Helpers

```ts
import { RPL, getValue, hasValue } from "@ssar-group/conduit.js";

const normalized = RPL(result.value);
const name = getValue(result, "user.name", "Unknown");
const matches = hasValue(result, { ok: true });
```

- `RPL` gives a small typed wrapper around the parsed value.
- `getValue` reads dotted paths safely.
- `hasValue` compares `result.value` with another value using deep equality.

## Development

```bash
npm install
npm run build
npm test
npm run check
```

`npm run check` typechecks the package, builds `dist`, runs the automated tests, and runs the example smoke test.

`prepack` runs the same checks before packaging. The npm package is limited to the files listed in `package.json`.

## Contributing

Bug reports and pull requests are welcome:

- Issues: <https://github.com/ssar-group/conduit.js/issues>
- Pull requests: <https://github.com/ssar-group/conduit.js/pulls>

Please keep changes small, tested, and documented. Community interactions follow the [SSAR Group Code of Conduct](https://github.com/ssar-group/.github/blob/main/profile/CODE_OF_CONDUCT.md).

## Repository Status

This repository is currently:

[![status](https://img.shields.io/badge/status-active-44cc11.svg)](#repository-status)

**Active** - maintained, open to issues, and open to pull requests. See the [SSAR Group status labels](https://github.com/ssar-group/.github/blob/main/profile/README.md#repository-status-labels) for how status labels are used across SSAR Group repositories.

## Community & Support

- **Documentation**: <https://docs.ssar-group.com>
- **Blog**: <https://blog.ssar-group.com>
- **General inquiries**: <contactus@ssar-group.com>
- **Security reports**: <security@ssar-group.com>

---

<div align="center">

Built by <a href="https://github.com/ssar-group">SSAR Group</a>

</div>
