import * as vscode from "vscode";
import { TargetFile } from "./target";

let playDecoration: vscode.TextEditorDecorationType | undefined = undefined;

const addRunDecoration = (
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

let runIncludedDecoration: vscode.TextEditorDecorationType | undefined =
  undefined;

const addRunIncludedDecoration = async (
  context: vscode.ExtensionContext,
  targetFile: TargetFile
) => {
  if (runIncludedDecoration === undefined) {
    // creating decoration type
    runIncludedDecoration = vscode.window.createTextEditorDecorationType({
      gutterIconPath: context.asAbsolutePath(
        "icons/vscode-icons/dark/run-above.svg"
      ),
      gutterIconSize: "contain",
    });
  }

  const decorationOptions: vscode.DecorationOptions[] = [];
  for await (const includedTargetFile of targetFile.getIncludedFiles({
    recursive: false,
  })) {
    const includeDirectiveRane: vscode.Range = includedTargetFile.getIncludeDirectiveRange();
    const decorationOption: vscode.DecorationOptions = {
      range: includeDirectiveRane,
    };
    decorationOptions.push(decorationOption);
  }

  vscode.window.activeTextEditor?.setDecorations(
    runIncludedDecoration,
    decorationOptions
  );
};

export const updateDecorations = async (
  context: vscode.ExtensionContext,
  targetFile: TargetFile
) => {
  addRunDecoration(context, targetFile);
  await addRunIncludedDecoration(context, targetFile);
};
