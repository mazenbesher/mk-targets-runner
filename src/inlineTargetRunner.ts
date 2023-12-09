import * as vscode from "vscode";

import * as config from "./config";
import * as target from "./target";
import { Runner } from "./runner";
import { InlineRunnerLocation } from "./constants";

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
      const targetFile = new target.TargetFile(doc, this.runner);

      // direct targets
      for await (const directTarget of targetFile.getDirectTargets()) {
        // where to show the code lens (inline runner location)
        let inlineRunnerLine: vscode.TextLine = directTarget.getLine();
        switch (config.getInlineRunnerLocation()) {
          case InlineRunnerLocation.Target:
            inlineRunnerLine = directTarget.getLine();
            break;
          case InlineRunnerLocation.Comment:
            inlineRunnerLine = directTarget.getCommentLine();
            break;
        }

        // add run target code lens
        const runTargetCommand: vscode.Command = {
          title: "$(play) Run",
          command: `mk-targets-runner.runTarget.${this.runner.cmd}`,
          arguments: [directTarget],
        };
        codeLenses.push(
          new vscode.CodeLens(inlineRunnerLine.range, runTargetCommand)
        );

        // add dry run target code lens
        const dryRunTargetCommand: vscode.Command = {
          title: "$(dashboard) Dry Run",
          command: `mk-targets-runner.dryRunTarget.${this.runner.cmd}`,
          arguments: [directTarget],
        };
        codeLenses.push(
          new vscode.CodeLens(inlineRunnerLine.range, dryRunTargetCommand)
        );
      }

      // included targets
      const targetsPerLineNumber: Map<
        number,
        {
          line: vscode.TextLine;
          includedTargets: target.IncludedTarget[];
        }
      > = new Map();
      for await (const includedTargetFile of targetFile.getIncludedFiles({
        recursive: false, // since we want to display the targets on the same line
      })) {
        // get included targets in the included file
        const includedTargets: target.IncludedTarget[] =
          await includedTargetFile.getAllTargetsFromParent();

        // if no targets found, skip
        if (!includedTargets.length) {
          continue;
        }

        // get the include file line
        const line: vscode.TextLine = doc.lineAt(
          doc.positionAt(includedTargetFile.includeMatchIndex)
        );

        // add included targets to the map for the line number
        const lineNumber = line.lineNumber;
        if (targetsPerLineNumber.has(lineNumber)) {
          // since an include directive could be a glob to multiple files, we could have targets from multiple files on the same line!
          targetsPerLineNumber
            .get(lineNumber)
            ?.includedTargets.push(...includedTargets);
        } else {
          targetsPerLineNumber.set(lineNumber, {
            line,
            includedTargets,
          });
        }
      }

      // for each line, show included targets with files
      for (const [
        lineNumber,
        { includedTargets, line },
      ] of targetsPerLineNumber) {
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
