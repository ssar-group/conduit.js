//
// Example: Multi-language script execution
// Demonstrates running Python, Ruby, and other supported languages
//
import { Execute } from "../dist/native.js";
async function multiLanguageDemo() {
    console.log("🌍 Multi-Language Script Execution Demo\n");
    // Python
    console.log("🐍 Python:");
    const pyResult = await Execute("examples/node-test.py", {
        args: ["Python User"],
    });
    console.log("   Result:", pyResult.value);
    console.log();
    // Ruby
    console.log("💎 Ruby:");
    const rbResult = await Execute("examples/test.rb", {
        args: ["Ruby User"],
    });
    console.log("   Result:", rbResult.value);
    console.log();
    console.log("✅ All languages executed successfully!");
}
multiLanguageDemo().catch(console.error);
