import { Execute } from "../dist/native.js";
async function runScripts() {
    console.log("Run scripts in different languages\n");
    const pyResult = await Execute("examples/node-test.py", {
        args: ["Python User"],
    });
    console.log("Python:", pyResult.value);
    console.log();
    const rbResult = await Execute("examples/test.rb", {
        args: ["Ruby User"],
    });
    console.log("Ruby:", rbResult.value);
    console.log();
    console.log("Done");
}
runScripts().catch(console.error);
