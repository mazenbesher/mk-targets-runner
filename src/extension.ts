import * as vscode from "vscode";

import * as config from "./config";
import * as utils from "./utils";
import * as quickPick from "./quickPick";
import { Target } from "./target";
import { Make, Just } from "./runner";
import { WorkspaceStateKey } from "./constants";

const rerunLastTarget = (context: vscode.ExtensionContext) => {
  // get target from workspace state
  const lastTarget: Target | undefined = context.workspaceState.get(
    WorkspaceStateKey.LastExecutedTarget
  );
  if (!lastTarget) {
    vscode.window.showInformationMessage(`No last target found.`);
    return;
  }
  lastTarget.run(context);
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.runTarget.make",
      async () => await quickPick.showQuickPick(context, Make)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.runTarget.just",
      async () => await quickPick.showQuickPick(context, Just)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("mk-targets-runner.rerunLastTarget", () =>
      rerunLastTarget(context)
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
