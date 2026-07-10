import conduit from "../dist/native.js";

async function main() {
  console.log("Run Python script");

  const result = await conduit("examples/node-test.py", {
    args: ["World"],
    debug: true,
  });

  console.log("Status:", result.status);
  console.log("Output:", result.stdout);
  console.log("Value:", result.value);
}

await main().catch(console.error);
