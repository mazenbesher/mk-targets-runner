import * as vscode from "vscode";
import { Runner } from "./runner";

export const getFilePattern = (runner: Runner): string[] => {
  const filePattern: string[] | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner.filePattern")
    .get(runner.cmd);
  if (!filePattern || !filePattern.length) {
    throw new Error(`No file pattern found for runner ${runner}`);
  }
  return filePattern;
};

export const getExcludedFolders = (): string[] => {
  const excludedFoldersPatterns: string[] | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner")
    .get("excludedFoldersPatterns");
  if (!excludedFoldersPatterns) {
    throw new Error(`No excluded folders patterns found.`);
  }
  return excludedFoldersPatterns;
};

export const isInlinedRunnerEnabled = (): boolean => {
  const isInlinedRunnerEnabled: boolean | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner")
    .get("enableInlineTargetRunner");
  if (isInlinedRunnerEnabled === undefined) {
    throw new Error(`enableInlineTargetRunner not found`);
  }
  return isInlinedRunnerEnabled;
};
