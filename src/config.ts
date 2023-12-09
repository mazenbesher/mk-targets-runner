import * as vscode from "vscode";
import { Runner } from "./runner";
import { InlineRunnerLocation } from "./constants";

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

export const getRunCmd = (runner: Runner): string => {
  const command: string | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner.command")
    .get(runner.cmd);
  if (!command) {
    // TODO: user friendly error message
    throw new Error(`No command found for runner ${runner.cmd}`);
  }
  return command;
};

export const getDryRunCmd = (runner: Runner): string => {
  const dryrunCommand: string | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner.dryrun")
    .get(runner.cmd);
  if (!dryrunCommand) {
    // TODO: user friendly error message
    throw new Error(`No command found for runner ${runner.cmd}`);
  }
  return dryrunCommand;
};

export const getInlineRunnerLocation = (): InlineRunnerLocation => {
  const loc: InlineRunnerLocation | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner")
    .get("inlineRunnerLocation");
  if (!loc) {
    throw new Error(`No inlineRunnerLocation found`);
  }
  return loc;
};
