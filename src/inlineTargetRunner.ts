import * as vscode from "vscode";

import * as config from "./config";
import * as target from "./target";
import { Runner } from "./runner";

export class InlineTargetRunner
  implements vscode.CodeLensProvider<vscode.CodeLens>
{
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor(public runner: Runner) {
    // rerender code lenses when config changes
    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    doc: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (!config.isInlinedRunnerEnabled()) {
      return [];
    }

    // don't show code lenses for closed or untitled documents
    if (doc.isClosed || doc.isUntitled) {
      return [];
    }

    return new Promise<vscode.CodeLens[]>(async (resolve, reject) => {
      const codeLenses: vscode.CodeLens[] = [];
      const fileUri = doc.uri;

      // direct targets
      for await (const directTarget of target.getDirectTargetsInFile(
        fileUri,
        this.runner
      )) {
        // get target line
        const matchPosition: vscode.Position = doc.positionAt(
          directTarget.match.index + directTarget.comment.length + 2
          // TODO: why 2?
          // Without comment.length, the codelens would appera at the comment line, not the target line
        );
        const line: vscode.TextLine = doc.lineAt(matchPosition);

        // add run target code lens
        const runTargetCommand: vscode.Command = {
          title: "$(play) Run",
          command: `mk-targets-runner.runTarget.${this.runner.cmd}`,
          arguments: [directTarget],
        };
        codeLenses.push(new vscode.CodeLens(line.range, runTargetCommand));

        // add dry run target code lens
        const dryRunTargetCommand: vscode.Command = {
          title: "$(dashboard) Dry Run",
          command: `mk-targets-runner.dryRunTarget.${this.runner.cmd}`,
          arguments: [directTarget],
        };
        codeLenses.push(new vscode.CodeLens(line.range, dryRunTargetCommand));
      }

      // included targets
      const fileDoc: vscode.TextDocument =
        await vscode.workspace.openTextDocument(fileUri);
      for await (const {
        doc: includedFileDoc,
        includeMatchIndex,
      } of target.getIncludedFilesInFile({
        doc: fileDoc,
        runner: this.runner,
        recursive: false,
      })) {
        // get included targets in the included file
        const includedTargets: target.IncludedTarget[] = [];
        for await (const directTarget of target.getAllTargetsInFile(
          includedFileDoc.uri,
          this.runner
        )) {
          includedTargets.push(
            new target.IncludedTarget(directTarget, fileUri, includeMatchIndex)
          );
        }

        // if no targets found, skip
        if (!includedTargets.length) {
          continue;
        }

        // get the include file line
        const line: vscode.TextLine = doc.lineAt(
          doc.positionAt(includeMatchIndex)
        );

        // tooltip: list of included targets
        const tooltip: string =
          "Targets: " + includedTargets.map((target) => target.name).join(", ");

        // add show included targets quick pick code lens (run)
        const showQuicPickForIncludeDirectiveCommandRun: vscode.Command = {
          title: "$(play) Run included target",
          command: `mk-targets-runner.showIncludedTargets.run`,
          arguments: [includedTargets],
          tooltip,
        };
        codeLenses.push(
          new vscode.CodeLens(
            line.range,
            showQuicPickForIncludeDirectiveCommandRun
          )
        );

        // add show included targets quick pick code lens (dry run)
        const showQuicPickForIncludeDirectiveCommandDryRun: vscode.Command = {
          title: "$(dashboard) Dry Run included target",
          command: `mk-targets-runner.showIncludedTargets.dryRun`,
          arguments: [includedTargets],
          tooltip,
        };
        codeLenses.push(
          new vscode.CodeLens(
            line.range,
            showQuicPickForIncludeDirectiveCommandDryRun
          )
        );
      }

      resolve(codeLenses);
    });
  }
}
