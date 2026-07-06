//
// Example: Advanced usage with multiple scripts
// Shows error handling, value extraction, and helper functions
//
import { Execute, RPL, hasValue, getValue } from "../dist/native.js";
async function runMultipleScripts() {
    console.log("🔄 Running Multiple Scripts Example\n");
    // Example 1: Basic execution
    console.log("1️⃣  Basic Python execution:");
    const result1 = await Execute("examples/node-test.py", {
        args: ["Alice"],
    });
    console.log("   Greeting:", getValue(result1, "greeting"));
    console.log();
    // Example 2: Using RPL to normalize the result
    console.log("2️⃣  Using RPL (Result Processing Layer):");
    const normalized = RPL(result1.value);
    console.log("   Type:", normalized.type);
    console.log("   Value:", normalized.value);
    console.log();
    // Example 3: Checking for specific values
    console.log("3️⃣  Value checking:");
    const result3 = await Execute("examples/node-test.py", {
        args: ["Bob"],
    });
    if (hasValue(result3, { greeting: "Hello, Bob!", timestamp: "2025-02-09", status: "success" })) {
        console.log("   ✅ Received expected value!");
    }
    else {
        console.log("   ℹ️  Value:", result3.value);
    }
    console.log();
    // Example 4: Error handling
    console.log("4️⃣  Error handling (non-existent file):");
    try {
        await Execute("examples/does-not-exist.py");
    }
    catch (error) {
        console.log("   ❌ Caught error:", error.message);
    }
    console.log();
    // Example 5: With timeout
    console.log("5️⃣  With timeout (5 seconds):");
    const result5 = await Execute("examples/node-test.py", {
        args: ["Charlie"],
        timeoutMs: 5000,
    });
    console.log("   Status:", result5.status);
    console.log();
    console.log("✅ All examples completed!");
}
runMultipleScripts().catch(console.error);
