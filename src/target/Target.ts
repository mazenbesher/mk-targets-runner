import * as vscode from "vscode";

import * as config from "../config";
import * as utils from "../utils";
import { WorkspaceStateKey, Action } from "../constants";
import { Runner, TargetMatch } from "../runner";

export class Target {
  doc: vscode.TextDocument;
  runner: Runner;
  match: TargetMatch;

  // deduced from the doc
  uri: vscode.Uri;

  // deduced from the uri
  fsPath: string;
  dir: string;

  // deduced from the match
  name: string;
  comment: string;

  constructor({
    doc,
    runner,
    match,
  }: {
    doc: vscode.TextDocument;
    runner: Runner;
    match: TargetMatch;
  }) {
    this.doc = doc;
    this.match = match;
    this.runner = runner;

    // deduced attrs
    this.uri = doc.uri;
    this.fsPath = doc.uri.fsPath;
    const { fileDir } = utils.getNameAndDirOfFile(doc.uri);
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

  execute(context: vscode.ExtensionContext, action: Action): void {
    if (action === Action.Run) {
      this.run(context);
    } else if (action === Action.DryRun) {
      this.dryRun(context);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  }

  getCommentLine(): vscode.TextLine {
    const matchPosition: vscode.Position = this.doc.positionAt(
      this.match.index
    );
    return this.doc.lineAt(matchPosition);
  }

  getStartPos(): vscode.Position {
    return this.comment.length > 0
      ? this.doc.positionAt(
          // if there is a comment, then the target line is after the comment
          this.match.index + "# ".length + this.comment.length + "\n".length
        )
      : this.doc.positionAt(this.match.index);
  }

  getLine(): vscode.TextLine {
    return this.doc.lineAt(this.getStartPos());
  }

  getEndPos(): vscode.Position {
    return this.getRange().end;
  }

  getRange(): vscode.Range {
    // TODO: this is not fully corrent, for example if the line on which the target is defined starts with empty spaces!
    const startPos = this.getStartPos();
    const lineNumber: number = startPos.line;
    const line: vscode.TextLine = this.doc.lineAt(lineNumber);
    return line.range;
  }
}

export class IncludedTarget extends Target {
  constructor(
    public target: Target,
    public parentDoc: vscode.TextDocument, // the file in which the include directive is found
    public directiveMatchIndex: number
  ) {
    super({
      doc: parentDoc, // this is important to run the included target correctly (specifically the corret fsPath!)
      runner: target.runner,
      match: target.match,
    });
  }
}
