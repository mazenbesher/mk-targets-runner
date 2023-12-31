import * as vscode from "vscode";

import * as config from "./config";
import * as utils from "./utils";
import * as quickPickAllFiles from "./quickPick/allFiles";
import * as quickPickIncludedFiles from "./quickPick/included";
import * as events from "./events";
import { IncludedTarget } from "./target";
import { Target, TargetFile } from "./target";
import { allRunners } from "./runner";
import { WorkspaceStateKey, Action } from "./constants";
import { InlineTargetRunner } from "./inlineTargetRunner";

// src/gutter/editorLineNumberContext.ts
interface EditorLineNumberContextParams {
  lineNumber: number; // Note: lineNumber is one indexed!
  uri: vscode.Uri;
}

const targetFromGutter =
  (context: vscode.ExtensionContext, action: Action) =>
  async (params: EditorLineNumberContextParams) => {
    const activeDoc: vscode.TextDocument | undefined =
      vscode.window.activeTextEditor?.document;
    if (!activeDoc) {
      return;
    }
    const targetFile = TargetFile.createFromDoc(activeDoc);
    if (targetFile !== undefined) {
      targetFile
        .getTargetAtLine(params.lineNumber - 1)
        ?.execute(context, action); // -1 since lineNumber is one indexed but vscode.LineNumber is zero indexed
    }
  };

const includedTargetFromGutter =
  (action: Action) => async (params: EditorLineNumberContextParams) => {
    const activeDoc: vscode.TextDocument | undefined =
      vscode.window.activeTextEditor?.document;
    if (!activeDoc) {
      return;
    }
    const targetFile = TargetFile.createFromDoc(activeDoc);
    if (targetFile !== undefined) {
      // collect all possible included targets at that line
      let includedTargets: IncludedTarget[] = [];
      for await (const includedTargetFile of targetFile.getIncludedFilesAtLine(
        params.lineNumber - 1 // -1 since lineNumber is one indexed but vscode.LineNumber is zero indexed
      )) {
        if (includedTargetFile) {
          includedTargets = [
            ...includedTargets,
            ...(await includedTargetFile.getAllTargetsFromParent()),
          ];
        }
      }

      // show quick pick to select which target to run
      if (action === Action.Run) {
        vscode.commands.executeCommand(
          "mk-targets-runner.showIncludedTargets.run",
          includedTargets
        );
      } else if (action === Action.DryRun) {
        vscode.commands.executeCommand(
          "mk-targets-runner.showIncludedTargets.dryRun",
          includedTargets
        );
      } else {
        throw new Error(`Unknown action: ${action}`);
      }
    }
  };

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
export async function activate(context: vscode.ExtensionContext) {
  await events.addEventsSubscribtions(context);

  // register run target command from the gutter
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.targetFromGutter.run",
      targetFromGutter(context, Action.Run)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.targetFromGutter.dryrun",
      targetFromGutter(context, Action.DryRun)
    )
  );

  // register run included target command from the gutter
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.includedTargetFromGutter.run",
      includedTargetFromGutter(Action.Run)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.includedTargetFromGutter.dryrun",
      includedTargetFromGutter(Action.DryRun)
    )
  );

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
        async () => await quickPickAllFiles.show(runner)
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
        (tgt: Target) => tgt.dryRun()
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
          quickPickIncludedFiles.show(context, includedTargets, Action.Run);
        }
      ),
      // selected target will be dry run
      vscode.commands.registerCommand(
        "mk-targets-runner.showIncludedTargets.dryRun",
        async (includedTargets: IncludedTarget[]) => {
          quickPickIncludedFiles.show(context, includedTargets, Action.DryRun);
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
