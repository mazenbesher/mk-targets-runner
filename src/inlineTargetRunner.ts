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

    this.codeLenses = [];
    const fileUri = document.uri;
    const { fileDir } = utils.getFileDetails(fileUri);
    const text = document.getText();
    for (const targetMatch of this.runner.getMatchedTargetsInText(text)) {
      const line = document.lineAt(
        document.positionAt(targetMatch.match.index).line
      );
      const indexOf = line.text.indexOf(targetMatch.match[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(
        position,
        new RegExp(this.runner.targetRegexp)
      );
      if (range) {
        this.codeLenses.push(
          new TargetCodeLens(
            range,
            new target.Target({
              cmd: targetMatch.targetName,
              dir: fileDir,
              uri: fileUri,
              comment: targetMatch.comment,
              runner: this.runner,
            })
          )
        );
      }
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
