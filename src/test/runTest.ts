import * as os from "os";
import * as path from "path";

import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Path to sample project as first argument, the launched VS Code instance will open it
    const sampleProjectPath = path.resolve(__dirname, "../../sample-projects");

    // Solve the issue IPC handle sock is longer than 103 chars
    const userDataDir = ["--user-data-dir", `${os.tmpdir()}`];

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [sampleProjectPath, ...userDataDir],
    });
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

main();
