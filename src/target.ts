import * as vscode from "vscode";
import * as path from "path";

import * as utils from "./utils";
import * as config from "./config";
import { Runner } from "./runner";
import { WorkspaceStateKey } from "./constants";

export class Target {
  name: string;
  dir: string;
  uri: vscode.Uri;
  runner: Runner;
  fsPath: string;
  comment: string = "";

  constructor({
    cmd,
    dir,
    uri,
    runner,
    comment,
  }: {
    cmd: string;
    dir: string;
    uri: vscode.Uri;
    runner: Runner;
    comment?: string;
  }) {
    this.name = cmd;
    this.dir = dir;
    this.uri = uri;
    this.runner = runner;
    this.fsPath = uri.fsPath;
    this.comment = comment || "";
  }

  private _replacePlaceholdersInCmd(cmd: string): string {
    // replace placeholders with values
    for (const property in this) {
      if (this.hasOwnProperty(property)) {
        const placeholder = `<${property}>`;
        const value = this[property];
        if (typeof value === "string") {
          cmd = cmd.replace(placeholder, value);
        }
      }
    }
    return cmd;
  }

  get cmd(): string {
    return this._replacePlaceholdersInCmd(config.getRunCmd(this.runner));
  }

  private _sendCmdToTerminal(cmd: string): void {
    // send command to terminal if it exists or create one and send command
    let terminal = vscode.window.activeTerminal;
    if (!terminal) {
      terminal = vscode.window.createTerminal();
    }
    terminal.show();
    terminal.sendText(cmd);
  }

  get dryRunCmd(): string {
    return this._replacePlaceholdersInCmd(config.getDryRunCmd(this.runner));
  }

  run(context: vscode.ExtensionContext): void {
    // add target to workspace state
    context.workspaceState.update(WorkspaceStateKey.LastExecutedTarget, this);
    this._sendCmdToTerminal(this.cmd);
  }

  dryRun(context: vscode.ExtensionContext): void {
    this._sendCmdToTerminal(this.dryRunCmd);
  }
}

const getRenderedFileContent = async (
  doc: vscode.TextDocument,
  runner: Runner,
  previouslyIncludedPaths: string[] = []
): Promise<string> => {
  // if the targetfile has an include statement, then replace the content with the included file (verbatim)
  // `previouslyIncludedPaths` is used to avoid infinite loop if the included file has an include statement to the current file
  const fileDir = path.dirname(doc.uri.fsPath);
  const includeRegex = new RegExp(
    String.raw`^${runner.includeDirective}\s(.*)$`,
    "gm"
  );
  let fileContent = doc.getText();
  let match;
  while ((match = includeRegex.exec(fileContent)) !== null) {
    const includeFile = match[1];
    const includePath = path.join(fileDir, includeFile);
    const includePathAbs = path.resolve(includePath);
    if (!previouslyIncludedPaths.includes(includePathAbs)) {
      previouslyIncludedPaths.push(includePathAbs);
      const includeDoc = await vscode.workspace.openTextDocument(
        includePathAbs
      );
      const includeContent = await getRenderedFileContent(
        includeDoc,
        runner,
        previouslyIncludedPaths
      );
      fileContent = fileContent.replace(match[0], includeContent);
    }
  }

  return fileContent;
};

export async function* getTargetsInFile(
  fileUri: vscode.Uri,
  runner: Runner
): AsyncGenerator<Target, void, void> {
  const fileDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(
    fileUri
  );
  const fileContent = await getRenderedFileContent(fileDoc, runner);
  const { fileDir } = utils.getTextDocDetails(fileDoc);
  for (const { targetName, comment } of runner.getMatchedTargetsInText(
    fileContent
  )) {
    yield new Target({
      cmd: targetName,
      dir: fileDir,
      uri: fileUri,
      comment,
      runner,
    });
  }
}
