import * as vscode from "vscode";

import * as config from "./config";
import * as utils from "./utils";
import * as quickPickAllFiles from "./quickPick/allFiles";
import * as quickPickIncludedFiles from "./quickPick/included";
import { Target, IncludedTarget } from "./target";
import { allRunners } from "./runner";
import { WorkspaceStateKey } from "./constants";
import { InlineTargetRunner } from "./inlineTargetRunner";

const rerunLastTarget = (context: vscode.ExtensionContext) => {
  // get target from workspace state
  const lastTarget: Target | undefined = context.workspaceState.get(
    WorkspaceStateKey.LastExecutedTarget
  );
  if (!lastTarget || !(lastTarget instanceof Target)) {
    vscode.window.showInformationMessage(`No last target found.`);
    return;
  }
  lastTarget.run(context);
};

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  for (const runner of allRunners) {
    // register innline target runner
    vscode.languages.registerCodeLensProvider(
      {
        pattern: utils.globsToPattern(config.getFilePattern(runner)),
      },
      new InlineTargetRunner(runner)
    );

    // register run target command for each runner from a quick pick
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `mk-targets-runner.runTargetFromQuickPick.${runner.cmd}`,
        async () => await quickPickAllFiles.show(context, runner)
      )
    );

    // run target directly (used for the inline target runner)
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `mk-targets-runner.runTarget.${runner.cmd}`,
        (tgt: Target) => tgt.run(context)
      )
    );

    // dry run target (used for the inline target runner)
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `mk-targets-runner.dryRunTarget.${runner.cmd}`,
        (tgt: Target) => tgt.dryRun(context)
      )
    );
  }

  // show quick pick for targets from included file (used for the inline target runner)
  context.subscriptions.push(
    ...[
      // selected target will be run
      vscode.commands.registerCommand(
        "mk-targets-runner.showIncludedTargets.run",
        async (includedTargets: IncludedTarget[]) => {
          quickPickIncludedFiles.show(context, includedTargets, "run");
        }
      ),
      // selected target will be dry run
      vscode.commands.registerCommand(
        "mk-targets-runner.showIncludedTargets.dryRun",
        async (includedTargets: IncludedTarget[]) => {
          quickPickIncludedFiles.show(context, includedTargets, "dryRun");
        }
      ),
    ]
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mk-targets-runner.rerunLastTarget", () =>
      rerunLastTarget(context)
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
