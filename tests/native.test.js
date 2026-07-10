import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import Execute, { getValue, hasValue } from "../dist/native.js";

async function withTempProject(callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "conduit-test-"));

  try {
    return await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeScript(root, name, source) {
  const filePath = path.join(root, name);
  await writeFile(filePath, source, "utf8");
  return filePath;
}

test("executes a Python script and reads the last JSON line as value", async () => {
  await withTempProject(async (root) => {
    await writeScript(root, "value.py", [
      "import json",
      "print('working')",
      "print(json.dumps({'user': {'name': 'Ada'}, 'items': [1, 2]}))",
    ].join("\n"));

    const result = await Execute("value.py", { cwd: root });

    assert.equal(result.status, "success");
    assert.equal(result.exitCode, 0);
    assert.equal(getValue(result, "user.name"), "Ada");
    assert.equal(hasValue(result, { user: { name: "Ada" }, items: [1, 2] }), true);
  });
});

test("honors interpreter paths from conduit config", async () => {
  await withTempProject(async (root) => {
    await writeFile(
      path.join(root, "conduit.config.json"),
      JSON.stringify({ pythonPath: "conduit-python-that-does-not-exist" }),
      "utf8",
    );
    await writeScript(root, "value.py", "print('{}')\n");

    await assert.rejects(
      () => Execute("value.py", { cwd: root }),
      /conduit-python-that-does-not-exist/,
    );
  });
});

test("strict mode fails when stdout has no JSON value", async () => {
  await withTempProject(async (root) => {
    await writeScript(root, "plain.py", "print('plain text only')\n");

    const result = await Execute("plain.py", { cwd: root, strict: true });

    assert.equal(result.status, "error");
    assert.match(result.stderr, /did not contain a JSON value/);
  });
});

test("strict mode fails when a successful script writes to stderr", async () => {
  await withTempProject(async (root) => {
    await writeScript(root, "stderr.py", [
      "import json",
      "import sys",
      "print('warning', file=sys.stderr)",
      "print(json.dumps({'ok': True}))",
    ].join("\n"));

    const result = await Execute("stderr.py", { cwd: root, strict: true });

    assert.equal(result.status, "error");
    assert.match(result.stderr, /wrote to stderr/);
    assert.deepEqual(result.value, { ok: true });
  });
});

test("kills a script when stdout exceeds maxStdoutBytes", async () => {
  await withTempProject(async (root) => {
    await writeScript(root, "large.py", "print('x' * 2048)\n");

    const result = await Execute("large.py", {
      cwd: root,
      maxStdoutBytes: 32,
    });

    assert.equal(result.status, "error");
    assert.equal(result.exitCode, -1);
    assert.ok(Buffer.byteLength(result.stdout) <= 32);
    assert.match(result.stderr, /stdout exceeded maxStdoutBytes limit of 32 bytes/);
  });
});

test("rejects invalid native execution options", async () => {
  await withTempProject(async (root) => {
    await writeScript(root, "value.py", "print('{}')\n");

    await assert.rejects(
      () => Execute("value.py", { cwd: root, args: ["ok", 1] }),
      /Options args must be an array of strings/,
    );

    await assert.rejects(
      () => Execute("value.py", { cwd: root, maxStdoutBytes: 1.5 }),
      /maxStdoutBytes must be a positive integer/,
    );
  });
});

test("aborts a running script with AbortSignal", async () => {
  await withTempProject(async (root) => {
    await writeScript(root, "slow.py", [
      "import json",
      "import time",
      "time.sleep(5)",
      "print(json.dumps({'done': True}))",
    ].join("\n"));

    const controller = new AbortController();
    const pending = Execute("slow.py", { cwd: root, signal: controller.signal });

    setTimeout(() => controller.abort(), 50);

    const result = await pending;

    assert.equal(result.status, "error");
    assert.equal(result.exitCode, -1);
    assert.match(result.stderr, /Execution aborted/);
  });
});
