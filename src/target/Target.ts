import * as vscode from "vscode";

import * as config from "../config";
import { WorkspaceStateKey } from "../constants";
import { Runner, TargetMatch } from "../runner";
import * as utils from "../utils";

export class Target {
  uri: vscode.Uri;
  runner: Runner;
  match: TargetMatch;

  // deduced from the uri
  fsPath: string;
  dir: string;

  // deduced from the match
  name: string;
  comment: string;

  constructor({
    uri,
    runner,
    match,
  }: {
    uri: vscode.Uri;
    runner: Runner;
    match: TargetMatch;
  }) {
    this.match = match;
    this.uri = uri;
    this.runner = runner;

    // deduced attrs
    this.fsPath = uri.fsPath;
    const { fileDir } = utils.getNameAndDirOfFile(uri);
    this.dir = fileDir;
    this.name = match.targetName;
    this.comment = match.comment;
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

  get dryRunCmd(): string {
    return this._replacePlaceholdersInCmd(config.getDryRunCmd(this.runner));
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

  run(context: vscode.ExtensionContext): void {
    // add target to workspace state
    context.workspaceState.update(WorkspaceStateKey.LastExecutedTarget, this);
    this._sendCmdToTerminal(this.cmd);
  }

  dryRun(context: vscode.ExtensionContext): void {
    this._sendCmdToTerminal(this.dryRunCmd);
  }

  getTargetCommentLine(fileDoc: vscode.TextDocument): vscode.TextLine {
    const matchPosition: vscode.Position = fileDoc.positionAt(this.match.index);
    return fileDoc.lineAt(matchPosition);
  }

  getTargetLine(fileDoc: vscode.TextDocument): vscode.TextLine {
    const matchPosition: vscode.Position = fileDoc.positionAt(
      this.match.index + "# ".length + this.comment.length + "\n".length
    );
    return fileDoc.lineAt(matchPosition);
  }
}

export class IncludedTarget extends Target {
  constructor(
    public target: Target,
    public parentUri: vscode.Uri, // the uri of the file in which the include directive is found
    public directiveMatchIndex: number
  ) {
    super({
      uri: parentUri, // this is important to run the included target correctly (specifically the corret fsPath!)
      runner: target.runner,
      match: target.match,
    });
  }
}
