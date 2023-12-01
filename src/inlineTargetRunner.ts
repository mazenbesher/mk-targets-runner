import * as vscode from "vscode";

import * as config from "./config";
import * as target from "./target";
import * as utils from "./utils";
import { Runner } from "./runner";

class TargetCodeLens extends vscode.CodeLens {
  constructor(
    range: vscode.Range,
    public target: target.Target,
    command?: vscode.Command
  ) {
    super(range, command);
  }
}

export class InlineTargetRunner implements vscode.CodeLensProvider {
  private codeLenses: TargetCodeLens[] = [];
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor(public runner: Runner) {
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (!config.isInlinedRunnerEnabled()) {
      return [];
    }

    // don't show code lenses for closed or untitled documents
    if (document.isClosed || document.isUntitled) {
      return [];
    }

    this.codeLenses = [];
    const { fileDir } = utils.getTextDocDetails(document);
    const fileUri = document.uri;
    const text = document.getText();
    const newLineChar =
      document.eol === vscode.EndOfLine.LF
        ? text.split("\n")
        : text.split("\r\n");

    for (const {
      targetName,
      comment,
      matchIndex,
    } of this.runner.getMatchedTargetsInText(text)) {
      const matchPosition: vscode.Position = document.positionAt(
        matchIndex + comment.length + 2
        // TODO: why 2?
        // Without comment.length, the codelens would appera at the comment line, not the target line
      );
      const line: vscode.TextLine = document.lineAt(matchPosition);
      const newTarget = new target.Target({
        cmd: targetName,
        dir: fileDir,
        uri: fileUri,
        comment: comment,
        runner: this.runner,
      });
      this.codeLenses.push(new TargetCodeLens(line.range, newTarget));
    }
    return this.codeLenses;
  }

  public resolveCodeLens(
    codeLens: TargetCodeLens,
    token: vscode.CancellationToken
  ) {
    if (!config.isInlinedRunnerEnabled()) {
      return null;
    }

    codeLens.command = {
      title: "$(play) Run Target",
      command: `mk-targets-runner.runTarget.${this.runner.cmd}`,
      arguments: [codeLens.target],
    };
    return codeLens;
  }
}
