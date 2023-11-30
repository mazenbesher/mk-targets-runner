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
