import * as vscode from "vscode";

export const globsToPattern = (files: string[]): string => {
  // e.g.[Makefile, *.mk] => "{**/Makefile,**/*.mk}"
  return `{**/${files.join(",**/")}}`;
};

export const getTextDocDetails = (fileDoc: vscode.TextDocument) => {
  const fileUri = fileDoc.uri;
  const fileName: string | undefined = fileUri.fsPath.split("/").pop();
  if (!fileName) {
    throw new Error("No file name found");
  }
  const fileDir = fileUri.fsPath.replace(fileName, "");
  const eolChar = fileDoc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
  return { fileName, fileDir, eolChar };
};

export const getPythonInterpreter = async (): Promise<string> => {
  const pythonExtension = vscode.extensions.getExtension("ms-python.python");
  if (!pythonExtension) {
    throw new Error("Python extension not found");
  }

  // Make sure the Python extension is activated
  await pythonExtension.activate();

  if (pythonExtension.exports) {
    // Use the Python extension API to get the active interpreter
    const pythonPath =
      pythonExtension.exports.settings.getExecutionDetails().execCommand;
    return pythonPath;
  } else {
    throw new Error("Unable to access Python extension API");
  }
};
