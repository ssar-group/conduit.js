//
// Small test file used to validate Conduit.js execution.
// It runs a random external script, prints the result,
// and makes sure outputs, status, and values are correctly received.
// ----
// by @AkzW21
// ----

import conduit from "../dist/native.js";

async function main() {
  console.log("🚀 Running Python Script...\n");

  const result = await conduit("examples/node-test.py", {
    args: ["World"],
    debug: true,
  });

  console.log("\n📊 Results:");
  console.log("━".repeat(50));
  console.log("Status:", result.status);
  console.log("Exit Code:", result.exitCode);
  console.log("\n📝 Output:");
  console.log(result.stdout);

  if (result.stderr) {
    console.log("\n⚠️  Stderr:");
    console.log(result.stderr);
  }

  console.log("\n💎 Parsed Value:");
  console.log(JSON.stringify(result.value, null, 2));
  console.log("━".repeat(50));
}

await main().catch(console.error);
