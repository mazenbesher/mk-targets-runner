import * as vscode from "vscode";

import { TargetFile, Target } from "./target";
import { updateDecorations } from "./decorations";

/**
 * update context based on the active file
 */
const activeEditorChanged = async (
  editor: vscode.TextEditor,
  context: vscode.ExtensionContext
) => {
  const activeDoc: vscode.TextDocument = editor.document;
  const targetFile = TargetFile.createFromDoc(activeDoc);
  const isTargetFile = targetFile !== undefined;

  const oneIndexedTargetsLinesNumbers: number[] = [];
  if (isTargetFile) {
    for (const directTarget of targetFile.getDirectTargets()) {
      const targetLine: vscode.TextLine = directTarget.getLine();
      oneIndexedTargetsLinesNumbers.push(targetLine.lineNumber + 1);
    }
    await updateDecorations(context, targetFile);
  }

  // register context for the "when" clause in package.json
  vscode.commands.executeCommand(
    "setContext",
    "mk-targets-runner.activeTargetFile",
    isTargetFile
  );

  vscode.commands.executeCommand(
    "setContext",
    "mk-targets-runner.targetLines",
    oneIndexedTargetsLinesNumbers // e.g. [1, 6, 8]
  );
};

export const addEventsSubscribtions = async (
  context: vscode.ExtensionContext
) => {
  // first time when the extension is activated
  if (vscode.window.activeTextEditor !== undefined) {
    await activeEditorChanged(vscode.window.activeTextEditor, context);
  }

  // on each active file change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (!editor) {
        return;
      }
      await activeEditorChanged(editor, context);
    })
  );

  // when editing the active file
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (vscode.window.activeTextEditor?.document.uri === event.document.uri) {
        // content of active file changed or file saved etc...
        const targetFile = TargetFile.createFromDoc(event.document);
        if (targetFile !== undefined) {
          await updateDecorations(context, targetFile);
        }
      }
    })
  );
};
