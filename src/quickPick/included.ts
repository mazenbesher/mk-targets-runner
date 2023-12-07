/* quickpick for targets from included files */

import * as vscode from "vscode";

import { IncludedTarget } from "../target";
import { QuickPickItemTarget } from "./QuickPickItemTarget";
import { createQuickPickForTargets } from "./common";
import { Action } from "../constants";

export const show = async (
  context: vscode.ExtensionContext,
  includedTargets: IncludedTarget[],
  action: Action
) => {
  // no targets found
  if (!includedTargets.length) {
    // this should never happen
    vscode.window.showErrorMessage(`No included targets found.`);
    return;
  }

  // populate items from included targets
  const items: QuickPickItemTarget[] = includedTargets.map(
    (includedTarget) => new QuickPickItemTarget(includedTarget)
  );

  // error occurred
  if (!items) {
    return;
  }

  createQuickPickForTargets(
    items,
    (quickPickItemTarget: QuickPickItemTarget) => {
      quickPickItemTarget.target.execute(context, action);
    }
  );
};
