import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

import * as utils from "../utils";
import * as config from "../config";
import { Target, IncludedTarget } from "./index";
import { allRunners, Runner } from "../runner";

export class TargetFile {
  constructor(public doc: vscode.TextDocument, public runner: Runner) {}

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
    const fileContent = this.doc.getText();
    for (const targetMatch of this.runner.getMatchedTargetsInText(
      fileContent
    )) {
      yield new Target({
        doc: this.doc,
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
  }): AsyncGenerator<IncludedTargetFile, void, void> {
    // default value for previouslyIncludedPaths is empty array
    if (previouslyIncludedPaths === undefined) {
      previouslyIncludedPaths = [];
    }

    // if the targetfile has an include statement, then replace the content with the included file (verbatim)
    // `previouslyIncludedPaths` is used to avoid infinite loop if the included file has an include statement to the current file
    const fileDir = path.dirname(this.doc.uri.fsPath);
    const includeRegex = new RegExp(
      String.raw`^${this.runner.includeDirective}\s(.*)$`,
      "gm"
    );
    let fileContent = this.doc.getText();
    let match;
    while ((match = includeRegex.exec(fileContent)) !== null) {
      const includedFiles: vscode.Uri[] = [];

      // get include pattern e.g. 'file.mk', '*.mk', 'dir/*.mk', 'dir/**/*.mk'
      const includePattern: vscode.GlobPattern = match[1];

      // relative to the current file directory
      const relativePattern: vscode.RelativePattern =
        new vscode.RelativePattern(fileDir, includePattern);

      for (const includedFileUri of await vscode.workspace.findFiles(
        relativePattern
      )) {
        includedFiles.push(includedFileUri);
      }

      // or from resolved relative pattern

      // resolve any relative path in the include pattern
      // e.g. dir1/dir2/.. -> dir1
      const includePatternResolved: vscode.GlobPattern = path.resolve(
        fileDir,
        includePattern
      );

      // check if valid file path within the workspace
      if (fs.existsSync(includePatternResolved)) {
        const includedFileUri: vscode.Uri = vscode.Uri.file(
          includePatternResolved
        );
        includedFiles.push(includedFileUri);
      }

      // find all files that match this relative pattern
      for (const includedFileUri of includedFiles) {
        const includedDoc: vscode.TextDocument =
          await vscode.workspace.openTextDocument(includedFileUri);
        yield new IncludedTargetFile(
          includedDoc,
          this.runner,
          match.index,
          this
        );

        if (
          recursive &&
          !previouslyIncludedPaths.includes(includedFileUri.toString())
        ) {
          previouslyIncludedPaths.push(includedFileUri.toString());
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
    for await (const includedTargetFile of this.getIncludedFiles({})) {
      // const includedTargetFile = new TargetFile(includedTargetFile.fileDoc, this.runner);
      for await (const target of includedTargetFile.getDirectTargets()) {
        yield new IncludedTarget(
          target,
          this.doc,
          includedTargetFile.includeMatchIndex
        );
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

  /**
   * Note: since the include directive could be a glob to multiple files, we could have targets from multiple files on the same line!
   */
  async *getIncludedFilesAtLine(
    lineNumber: number
  ): AsyncGenerator<IncludedTargetFile | undefined> {
    const includedFiles: IncludedTargetFile[] = [];
    for await (const includedTargetFile of this.getIncludedFiles({
      recursive: false,
    })) {
      const includeDirectiveLine = includedTargetFile.getIncludeDirectiveLine();
      if (includeDirectiveLine.lineNumber === lineNumber) {
        yield includedTargetFile;
      }
    }
  }
}

/**
 * Represents a target that is included from another file.
 * The `includeMatchIndex` property is the index of the include directive in the parent file.
 */
export class IncludedTargetFile extends TargetFile {
  constructor(
    public doc: vscode.TextDocument,
    public runner: Runner,
    public includeMatchIndex: number,
    public parentTargetFile: TargetFile
  ) {
    super(doc, runner);
  }

  getIncludeDirectiveStartPos(): vscode.Position {
    return this.parentTargetFile.doc.positionAt(this.includeMatchIndex);
  }

  /**
   *
   * @returns the range of the include directive in the parent file
   */
  getIncludeDirectiveRange(): vscode.Range {
    const startPos = this.getIncludeDirectiveStartPos();
    const lineNumber: number = startPos.line;
    const line: vscode.TextLine = this.parentTargetFile.doc.lineAt(lineNumber);
    return line.range;
  }

  getIncludeDirectiveLine(): vscode.TextLine {
    return this.parentTargetFile.doc.lineAt(this.getIncludeDirectiveStartPos());
  }

  /**
   * Retrieves all targets in a file from the parent prespective
   */
  async getAllTargetsFromParent(): Promise<IncludedTarget[]> {
    const includedTargets: IncludedTarget[] = [];

    for await (const tgtInIncluded of this.getAllTargets()) {
      includedTargets.push(
        new IncludedTarget(
          tgtInIncluded,
          this.parentTargetFile.doc,
          this.includeMatchIndex
        )
      );
    }
    return includedTargets;
  }
}
