import * as vscode from "vscode";
import { TargetFile } from "./target";

let playDecoration: vscode.TextEditorDecorationType | undefined = undefined;

export const updateDecorations = async (
  context: vscode.ExtensionContext,
  targetFile: TargetFile
) => {
  if (playDecoration === undefined) {
    // creating decoration type
    playDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath(
        "icons/vscode-icons/debug-start.svg"
      ),
      gutterIconSize: "contain",
    });
  }

  const decorationOptions: vscode.DecorationOptions[] = [];
  for (const directTarget of targetFile.getDirectTargets()) {
    const targetRange: vscode.Range = directTarget.getRange();
    const decorationOption: vscode.DecorationOptions = {
      range: targetRange,
    };
    decorationOptions.push(decorationOption);
  }

  vscode.window.activeTextEditor?.setDecorations(
    playDecoration,
    decorationOptions
  );
};
