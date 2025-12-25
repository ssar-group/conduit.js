//
// Small test file used to validate Conduit.js execution.
// It runs a random external script, prints the result,
// and makes sure outputs, status, and values are correctly received.
// ----
// by @AkzW21
// ----
const conduit = require("conduit.js/native");

async function main() {
  console.log("Running Python Script...");
  
  const result = await conduit("examples/node-test.py", {
    args: ["World"],
    debug: true
  });
  
  console.log("Status:", result.status);
  console.log("Output:", result.stdout);
  console.log("Value:", result.value);
}

main().catch(console.error);