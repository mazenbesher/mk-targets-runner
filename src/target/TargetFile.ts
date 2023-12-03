import * as vscode from "vscode";
import * as path from "path";

import * as utils from "../utils";
import * as config from "../config";
import { Target, IncludedTarget } from "./index";
import { allRunners, Runner } from "../runner";

export class TargetFile {
  constructor(public fileDoc: vscode.TextDocument, public runner: Runner) {}

  /**
   * If the file is a target file, then return the runner that matches the file. Otherwise, return undefined.
   */
  static isTargetFile(fileName: string): Runner | undefined {
    for (const runner of allRunners) {
      const targetFilesPatterns: string[] = config.getFilePattern(runner);
      for (const pattern of targetFilesPatterns) {
        const regex = utils.patternToRegex(pattern);
        if (regex.test(fileName)) {
          return runner;
        }
      }
    }
    return undefined;
  }

  /**
   * If the file is a target file, then return a TargetFile object. Otherwise, return undefined.
   */
  static createFromDoc(fileDoc: vscode.TextDocument): TargetFile | undefined {
    // get file name e.g. 'Makefile' from file uri e.g. 'file:///home/user/Makefile'
    const { fileName } = utils.getNameAndDirOfFile(fileDoc.uri);
    const runner = TargetFile.isTargetFile(fileName);
    if (runner) {
      return new TargetFile(fileDoc, runner);
    }
    return undefined;
  }

  /**
   * Retrieves all targets in a file that are defined in the file itself (not included from other files).
   */
  *getDirectTargets(): Generator<Target, void, void> {
    // const fileContent = await getRenderedFileContent(fileDoc, runner);
    const fileContent = this.fileDoc.getText();
    for (const targetMatch of this.runner.getMatchedTargetsInText(
      fileContent
    )) {
      yield new Target({
        doc: this.fileDoc,
        match: targetMatch,
        runner: this.runner,
      });
    }
  }

  async *getIncludedFiles({
    recursive = true,
    previouslyIncludedPaths = undefined,
  }: {
    recursive?: boolean;
    previouslyIncludedPaths?: string[];
  }): AsyncGenerator<
    { doc: vscode.TextDocument; includeMatchIndex: number },
    void,
    void
  > {
    // default value for previouslyIncludedPaths is empty array
    if (previouslyIncludedPaths === undefined) {
      previouslyIncludedPaths = [];
    }

    // if the targetfile has an include statement, then replace the content with the included file (verbatim)
    // `previouslyIncludedPaths` is used to avoid infinite loop if the included file has an include statement to the current file
    const fileDir = path.dirname(this.fileDoc.uri.fsPath);
    const includeRegex = new RegExp(
      String.raw`^${this.runner.includeDirective}\s(.*)$`,
      "gm"
    );
    let fileContent = this.fileDoc.getText();
    let match;
    while ((match = includeRegex.exec(fileContent)) !== null) {
      const includeFile: string = match[1];
      const includePath: string = path.join(fileDir, includeFile);
      const includePathAbs: string = path.resolve(includePath);
      if (!previouslyIncludedPaths.includes(includePathAbs)) {
        previouslyIncludedPaths.push(includePathAbs);
        const includedDoc: vscode.TextDocument =
          await vscode.workspace.openTextDocument(includePathAbs);
        yield {
          doc: includedDoc,
          includeMatchIndex: match.index,
        };
        if (recursive) {
          yield* new TargetFile(includedDoc, this.runner).getIncludedFiles({
            recursive,
            previouslyIncludedPaths,
          });
        }
      }
    }
  }

  /**
   * Retrieves only the targets that included from other files.
   */
  async *getIncludedTargets(): AsyncGenerator<IncludedTarget, void, void> {
    for await (const { includeMatchIndex } of this.getIncludedFiles({})) {
      for await (const target of this.getDirectTargets()) {
        yield new IncludedTarget(target, this.fileDoc, includeMatchIndex);
      }
    }
  }

  /**
   * Retrieves all targets in a file, including those included from other files.
   */
  async *getAllTargets(): AsyncGenerator<Target, void, void> {
    for await (const target of this.getDirectTargets()) {
      yield target;
    }
    for await (const includedTarget of this.getIncludedTargets()) {
      yield includedTarget.target;
    }
  }

  getTargetAtLine(line: vscode.TextLine): Target | undefined;
  getTargetAtLine(lineNumber: number): Target | undefined;
  getTargetAtLine(
    lineOrLineNumber: number | vscode.TextLine
  ): Target | undefined {
    let lineNumber: number;
    if (typeof lineOrLineNumber === "number") {
      lineNumber = lineOrLineNumber;
    } else {
      lineNumber = lineOrLineNumber.lineNumber;
    }
    for (const target of this.getDirectTargets()) {
      const targetLine = target.getLine();
      if (targetLine.lineNumber === lineNumber) {
        return target;
      }
    }
    return undefined;
  }
}
