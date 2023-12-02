import * as vscode from "vscode";
import { QuickPickItemTarget } from "./QuickPickItemTarget";

export const createQuickPickForTargets = (
  items: vscode.QuickPickItem[],
  execute: (target: QuickPickItemTarget) => void
) => {
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = items;
  quickPick.onDidChangeSelection((selection) => {
    if (selection[0]) {
      const selectedItem = selection[0];
      if (selectedItem instanceof QuickPickItemTarget) {
        execute(selectedItem);
      }
      quickPick.dispose(); // Disposes the quick pick after an item is selected
    }
  });
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
};
