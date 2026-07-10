import {
  Execute,
  RPL,
  hasValue,
  getValue,
} from "../dist/native.js";

async function runMultipleScripts() {
  console.log("Advanced usage\n");

  console.log("1. Basic Python execution");
  const result1 = await Execute("examples/node-test.py", {
    args: ["Alice"],
  });
  console.log("Greeting:", getValue(result1, "greeting"));
  console.log();

  console.log("2. Normalize the parsed value");
  const normalized = RPL(result1.value);
  console.log("Type:", normalized.type);
  console.log("Value:", normalized.value);
  console.log();

  console.log("3. Check an expected value");
  const result3 = await Execute("examples/node-test.py", {
    args: ["Bob"],
  });

  if (
    hasValue(result3, {
      greeting: "Hello, Bob!",
      timestamp: "2025-02-09",
      status: "success",
    })
  ) {
    console.log("Received the expected value");
  } else {
    console.log("Value:", result3.value);
  }
  console.log();

  console.log("4. Handle a missing script");
  try {
    await Execute("examples/does-not-exist.py");
  } catch (error) {
    console.log("Caught error:", error instanceof Error ? error.message : String(error));
  }
  console.log();

  console.log("5. Run with a timeout");
  const result5 = await Execute("examples/node-test.py", {
    args: ["Charlie"],
    timeoutMs: 5000,
  });
  console.log("Status:", result5.status);
  console.log();

  console.log("Done");
}

runMultipleScripts().catch(console.error);
