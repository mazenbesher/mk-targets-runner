import * as vscode from "vscode";

import { TargetFile } from "./target";

export const activeFileChanged = async (newActiveFile: vscode.Uri) => {
  const targetFile = await TargetFile.createFromUri(newActiveFile);
  const isTargetFile = targetFile !== undefined;
  const oneIndexedTargetsLinesNumbers: number[] = isTargetFile
    ? Array.from(targetFile.getTargetsLines()).map(
        (line) => line.lineNumber + 1
      )
    : [];

  // register context for the "when" clause in package.json
  vscode.commands.executeCommand(
    "setContext",
    "mk-targets-runner.activeTargetFile",
    isTargetFile
  );

  vscode.commands.executeCommand(
    "setContext",
    "mk-targets-runner.targetLines",
    oneIndexedTargetsLinesNumbers // e.g. [1, 6, 8]
  );
};
