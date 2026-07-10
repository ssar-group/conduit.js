import conduit from "../dist/native.js";

async function main() {
  console.log("Run Python script\n");

  const result = await conduit("examples/node-test.py", {
    args: ["World"],
    debug: true,
  });

  console.log("Status:", result.status);
  console.log("Exit Code:", result.exitCode);
  console.log();
  console.log("Output:");
  console.log(result.stdout);

  if (result.stderr) {
    console.log();
    console.log("Stderr:");
    console.log(result.stderr);
  }

  console.log();
  console.log("Parsed value:");
  console.log(JSON.stringify(result.value, null, 2));
}

await main().catch(console.error);
