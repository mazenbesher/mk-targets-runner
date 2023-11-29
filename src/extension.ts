// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";

// supported runners
enum Runner {
  Make = "make",
  Just = "just",
}

// include directives for each runner
const INCLUDE_DIRECTIVES: {
  [key in Runner]: string;
} = {
  [Runner.Make]: "include",
  [Runner.Just]: "!include",
};

// class to hold target information
class Target {
  name: string;
  dir: string;
  uri: vscode.Uri;
  runner: Runner;
  fsPath: string;
  comment: string = "";

  constructor({
    cmd,
    dir,
    uri,
    runner,
    comment,
  }: {
    cmd: string;
    dir: string;
    uri: vscode.Uri;
    runner: Runner;
    comment?: string;
  }) {
    this.name = cmd;
    this.dir = dir;
    this.uri = uri;
    this.runner = runner;
    this.fsPath = uri.fsPath;
    this.comment = comment || "";
  }

  get cmd(): string {
    // get run command from settings
    let command: string | undefined = vscode.workspace
      .getConfiguration("mk-targets-runner.command")
      .get(this.runner);
    if (!command) {
      throw new Error(`No command found for runner ${this.runner}`);
    }

    // replace placeholders with values
    for (const property in this) {
      if (this.hasOwnProperty(property)) {
        const placeholder = `<${property}>`;
        const value = this[property];
        if (typeof value === "string") {
          command = command.replace(placeholder, value);
        }
      }
    }
    return command;
  }

  run(): void {
    // send command to terminal if it exists or create one and send command
    let terminal = vscode.window.activeTerminal;
    if (!terminal) {
      terminal = vscode.window.createTerminal();
    }
    terminal.show();
    terminal.sendText(this.cmd);
  }
}

const getRenderedFileContent = async (
  doc: vscode.TextDocument,
  runner: Runner,
  previouslyIncludedPaths: string[] = []
): Promise<string> => {
  // if makefile and has an include statement, then replace the content with the included file (verbatim)
  // `previouslyIncludedPaths` is used to avoid infinite loop if the included file has an include statement to the current file
  const fileDir = path.dirname(doc.uri.fsPath);
  const includeRegex = new RegExp(
    String.raw`^${INCLUDE_DIRECTIVES[runner]}\s(.*)$`,
    "gm"
  );
  let fileContent = doc.getText();
  let match;
  while ((match = includeRegex.exec(fileContent)) !== null) {
    const includeFile = match[1];
    const includePath = path.join(fileDir, includeFile);
    const includePathAbs = path.resolve(includePath);
    if (!previouslyIncludedPaths.includes(includePathAbs)) {
      previouslyIncludedPaths.push(includePathAbs);
      const includeDoc = await vscode.workspace.openTextDocument(
        includePathAbs
      );
      const includeContent = await getRenderedFileContent(
        includeDoc,
        runner,
        previouslyIncludedPaths
      );
      fileContent = fileContent.replace(match[0], includeContent);
    }
  }

  return fileContent;
};

async function* getTargetsInFile(
  fileUri: vscode.Uri,
  runner: Runner
): AsyncGenerator<Target, void, void> {
  const fileDoc: vscode.TextDocument = await vscode.workspace.openTextDocument(
    fileUri
  );
  const fileContent = await getRenderedFileContent(fileDoc, runner);
  const fileName: string | undefined = fileUri.fsPath.split("/").pop();
  if (!fileName) {
    throw new Error("No file name found");
  }
  const fileDir = fileUri.fsPath.replace(fileName, "");
  const regex = /^(#([^\n]*)\n)?([a-zA-Z0-9_-]+):/gm;
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    // https://regex101.com/r/WZXw2l/1
    yield new Target({
      cmd: match[3],
      dir: fileDir,
      uri: fileUri,
      comment: match[2],
      runner,
    });
  }
}

class QuickPickItemTarget implements vscode.QuickPickItem {
  constructor(public target: Target) {}

  get label(): string {
    return `Run Target: ${this.target.name}`;
  }

  get description(): string {
    return this.target.comment;
  }
}

const getRelativeUri = (uri: vscode.Uri): string => {
  let relativePathLabel = vscode.workspace.asRelativePath(uri);

  const workspaceRoot = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceRoot) {
    // doesn't match any workspace folder
    return relativePathLabel;
  }

  // if relative path is the same as the workspace root
  if (relativePathLabel === workspaceRoot.name + "/") {
    relativePathLabel = "root";
  }

  return relativePathLabel;
};

const getItems = async (runner: Runner): Promise<vscode.QuickPickItem[]> => {
  // get configurations
  const filePattern: string[] | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner.filePattern")
    .get(runner);
  if (!filePattern) {
    throw new Error(`No file pattern found for runner ${runner}`);
  }

  const excludedFoldersPatterns: string[] | undefined = vscode.workspace
    .getConfiguration("mk-targets-runner")
    .get("excludedFoldersPatterns");
  if (!excludedFoldersPatterns) {
    throw new Error(`No excluded folders patterns found for runner ${runner}`);
  }

  const pattern = `{**/${filePattern.join(",**/")}}`; // e.g. {**/Makefile,**/*.mk} for [Makefile, *.mk]
  const excludePattern = `{${excludedFoldersPatterns.join(",")}}`; // e.g. {**/node_modules,**/.git} for [**/node_modules, **/.git]
  let filesUris = await vscode.workspace.findFiles(pattern, excludePattern);

  // if active file is a target file, then add it to the top of the list
  const activeFileUri = vscode.window.activeTextEditor?.document.uri;
  if (
    activeFileUri &&
    filesUris.some((uri) => uri.toString() === activeFileUri.toString())
  ) {
    // remove active file from the list and add it to the top
    filesUris = filesUris.filter(
      (uri) => uri.toString() !== activeFileUri.toString()
    );
    filesUris.unshift(activeFileUri);
  }

  let items: vscode.QuickPickItem[] = [];
  for (const fileUri of filesUris) {
    items.push({
      label: getRelativeUri(fileUri),
      kind: vscode.QuickPickItemKind.Separator,
    });
    for await (const target of getTargetsInFile(fileUri, runner)) {
      items.push(new QuickPickItemTarget(target));
    }
  }
  return items;
};

const showQuickPick = (items: vscode.QuickPickItem[]) => {
  // if no files found, then show error message
  if (!items.length) {
    vscode.window.showErrorMessage(
      `No target files found. Please check the file pattern and excluded folders patterns in the settings.`
    );
    return;
  }

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = items;
  quickPick.onDidChangeSelection((selection) => {
    if (selection[0]) {
      const selectedItem = selection[0];
      if (selectedItem instanceof QuickPickItemTarget) {
        selectedItem.target.run();
      }
      quickPick.dispose(); // Disposes the quick pick after an item is selected
    }
  });
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.makefiles.runTarget",
      async () => showQuickPick(await getItems(Runner.Make))
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.justfiles.runTarget",
      async () => showQuickPick(await getItems(Runner.Just))
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
