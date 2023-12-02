import * as vscode from "vscode";
import * as path from "path";

import * as utils from "./utils";
import * as config from "./config";
import { Runner, TargetMatch } from "./runner";
import { WorkspaceStateKey } from "./constants";

export class Target {
  uri: vscode.Uri;
  runner: Runner;
  match: TargetMatch;
  
  // deduced from the uri
  fsPath: string;
  dir: string;

  // deduced from the match
  name: string;
  comment: string;

  constructor({
    uri,
    runner,
    match,
  }: {
    uri: vscode.Uri;
    runner: Runner;
    match: TargetMatch;
  }) {
    this.match = match;
    this.uri = uri;
    this.runner = runner;
    
    // deduced attrs
    this.fsPath = uri.fsPath;
    const { fileDir } = utils.getNameAndDirOfFile(uri);
    this.dir = fileDir;
    this.name = match.targetName;
    this.comment = match.comment;
  }

  private _replacePlaceholdersInCmd(cmd: string): string {
    // replace placeholders with values
    for (const property in this) {
      if (this.hasOwnProperty(property)) {
        const placeholder = `<${property}>`;
        const value = this[property];
        if (typeof value === "string") {
          cmd = cmd.replace(placeholder, value);
        }
      }
    }
    return cmd;
  }

  get cmd(): string {
    return this._replacePlaceholdersInCmd(config.getRunCmd(this.runner));
  }

  get dryRunCmd(): string {
    return this._replacePlaceholdersInCmd(config.getDryRunCmd(this.runner));
  }

  private _sendCmdToTerminal(cmd: string): void {
    // send command to terminal if it exists or create one and send command
    let terminal = vscode.window.activeTerminal;
    if (!terminal) {
      terminal = vscode.window.createTerminal();
    }
    terminal.show();
    terminal.sendText(cmd);
  }

  run(context: vscode.ExtensionContext): void {
    // add target to workspace state
    context.workspaceState.update(WorkspaceStateKey.LastExecutedTarget, this);
    this._sendCmdToTerminal(this.cmd);
  }

  dryRun(context: vscode.ExtensionContext): void {
    this._sendCmdToTerminal(this.dryRunCmd);
  }
}

// // target in included file
// export class IncludedTarget {
//   constructor(
//     public target: Target,
//     public parentUri: vscode.Uri, // the uri of the file in which the include directive is found
//     public directiveMatchIndex: number
//   ) {}
// }

export class IncludedTarget extends Target {
  constructor(
    public target: Target,
    public parentUri: vscode.Uri, // the uri of the file in which the include directive is found
    public directiveMatchIndex: number
  ) {
    super({
      uri: parentUri, // this is important to run the included target correctly (specifically the corret fsPath!)
      runner: target.runner,
      match: target.match,
    });
  }
}

export async function* getIncludedFilesInFile({
  doc,
  runner,
  recursive = true,
  previouslyIncludedPaths = undefined,
}: {
  doc: vscode.TextDocument;
  runner: Runner;
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
  const fileDir = path.dirname(doc.uri.fsPath);
  const includeRegex = new RegExp(
    String.raw`^${runner.includeDirective}\s(.*)$`,
    "gm"
  );
  let fileContent = doc.getText();
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
        yield* getIncludedFilesInFile({
          doc: includedDoc,
          runner,
          recursive,
          previouslyIncludedPaths,
        });
      }
    }
  }
}

/**
 * Retrieves all targets in a file that are defined in the file itself (not included from other files).
 */
export async function* getDirectTargetsInFile(
  fileUri: vscode.Uri,
  runner: Runner
): AsyncGenerator<Target, void, void> {
  const fileDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(
    fileUri
  );
  // const fileContent = await getRenderedFileContent(fileDoc, runner);
  const fileContent = fileDoc.getText();
  for (const targetMatch of runner.getMatchedTargetsInText(fileContent)) {
    yield new Target({
      uri: fileUri,
      match: targetMatch,
      runner,
    });
  }
}

/**
 * Retrieves only the targets that included from other files.
 */
export async function* getIncludedTargetsInFile(
  fileUri: vscode.Uri,
  runner: Runner
): AsyncGenerator<IncludedTarget, void, void> {
  const fileDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(
    fileUri
  );
  for await (const {
    doc: includedFileDoc,
    includeMatchIndex,
  } of getIncludedFilesInFile({ doc: fileDoc, runner })) {
    for await (const target of getDirectTargetsInFile(
      includedFileDoc.uri,
      runner
    )) {
      yield new IncludedTarget(target, fileUri, includeMatchIndex);
    }
  }
}

/**
 * Retrieves all targets in a file, including those included from other files.
 */
export async function* getAllTargetsInFile(
  fileUri: vscode.Uri,
  runner: Runner
): AsyncGenerator<Target, void, void> {
  for await (const target of getDirectTargetsInFile(fileUri, runner)) {
    yield target;
  }
  for await (const includedTarget of getIncludedTargetsInFile(
    fileUri,
    runner
  )) {
    yield includedTarget.target;
  }
}
