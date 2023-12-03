import * as vscode from "vscode";

export const globsToPattern = (files: string[]): string => {
  // e.g.[Makefile, *.mk] => "{**/Makefile,**/*.mk}"
  return `{**/${files.join(",**/")}}`;
};

export const getNameAndDirOfFile = (
  fileUri: vscode.Uri
): { fileName: string; fileDir: string } => {
  const fileName: string | undefined = fileUri.fsPath.split("/").pop();
  if (!fileName) {
    throw new Error("No file name found");
  }
  return {
    fileName,
    fileDir: fileUri.fsPath.replace(fileName, ""),
  };
};

export const getEOLCharForTextDoc = (fileDoc: vscode.TextDocument): string => {
  return fileDoc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
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

// function to convert a pattern to a regular expression, e.g. '*.mk' to '^.*\.mk$'
export const patternToRegex = (pattern: string): RegExp => {
  const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // Escape special characters
  const regexPattern = escapedPattern.replace(/\\\*/g, ".*"); // Convert '*' to '.*'
  return new RegExp(`^${regexPattern}$`);
};
