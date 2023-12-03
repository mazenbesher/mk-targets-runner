import * as vscode from "vscode";

import * as config from "../config";
import * as utils from "../utils";
import * as target from "../target";
import { Runner } from "../runner";
import { QuickPickItemTarget } from "./QuickPickItemTarget";
import { createQuickPickForTargets } from "./common";

const getRelativePathLabel = (uri: vscode.Uri): string => {
  let relativePathLabel: string = vscode.workspace.asRelativePath(uri);

  const workspaceRoot = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceRoot) {
    // doesn't match any workspace folder
    return relativePathLabel;
  }

  // if relative path is the same as the workspace root
  if (relativePathLabel === workspaceRoot.name + "/") {
    relativePathLabel = "root";
  }

  return relativePathLabel;
};

const getItems = async (runner: Runner): Promise<vscode.QuickPickItem[]> => {
  const filePattern: string[] = config.getFilePattern(runner);
  const excludedFoldersPatterns: string[] = config.getExcludedFolders();

  const pattern = utils.globsToPattern(filePattern);
  const excludePattern = `{${excludedFoldersPatterns.join(",")}}`; // e.g. {**/node_modules,**/.git} for [**/node_modules, **/.git]
  let filesUris = await vscode.workspace.findFiles(pattern, excludePattern);

  // if active file is a target file, then add it to the top of the list
  const activeFileUri = vscode.window.activeTextEditor?.document.uri;
  if (
    activeFileUri &&
    filesUris.some((uri) => uri.toString() === activeFileUri.toString())
  ) {
    // remove active file from the list and add it to the top
    filesUris = filesUris.filter(
      (uri) => uri.toString() !== activeFileUri.toString()
    );
    filesUris.unshift(activeFileUri);
  }

  let items: vscode.QuickPickItem[] = [];
  for (const fileUri of filesUris) {
    items.push({
      label: getRelativePathLabel(fileUri),
      kind: vscode.QuickPickItemKind.Separator,
    });
    const targetFile = await target.TargetFile.createFromUri(fileUri);
    if (targetFile !== undefined) {
      for await (const tgt of targetFile.getAllTargets()) {
        items.push(new QuickPickItemTarget(tgt));
      }
    }
  }
  return items;
};

export const show = async (
  context: vscode.ExtensionContext,
  runner: Runner
) => {
  const items: vscode.QuickPickItem[] | undefined = await getItems(
    runner
  ).catch((err) => {
    vscode.window.showErrorMessage(err.message);
    return undefined;
  });

  // error occurred
  if (!items) {
    return;
  }

  // no files found
  if (!items.length) {
    vscode.window.showWarningMessage(`No target files found.`);
    return;
  }

  createQuickPickForTargets(
    items,
    (quickPickItemTarget: QuickPickItemTarget) => {
      quickPickItemTarget.target.dryRun(context);
    }
  );
};
