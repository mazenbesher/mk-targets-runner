import * as vscode from "vscode";

export const globsToPattern = (files: string[]): string => {
  // e.g.[Makefile, *.mk] => "{**/Makefile,**/*.mk}"
  return `{**/${files.join(",**/")}}`;
};

export const getFileDetails = (fileUri: vscode.Uri) => {
  const fileName: string | undefined = fileUri.fsPath.split("/").pop();
  if (!fileName) {
    throw new Error("No file name found");
  }
  const fileDir = fileUri.fsPath.replace(fileName, "");
  return { fileName, fileDir };
};
