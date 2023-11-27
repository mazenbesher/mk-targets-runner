// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// globals
// TODO: make configurable

// supported runners
enum Runner {
  Make = "make",
  Just = "just",
}

// exclude dirs
const EXCLUDE_DIRS = ["node_modules", ".git"];

// patterns for each runner files
const FILE_PATTERNS: {
  [key in Runner]: string[];
} = {
  [Runner.Make]: ["Makefile", "*.mk"],
  [Runner.Just]: ["justfile", "*.just"],
};

// run command for each runner
// supported placeholders are the string properties of the class Target
const RUN_COMMANDS: {
  [key in Runner]: string;
} = {
  [Runner.Make]: "<runner> -f <fsPath> <name>",
  [Runner.Just]: "<runner> -f <fsPath> <name>",
};

// class to hold target information
class Target {
  name: string;
  dir: string;
  uri: vscode.Uri;
  runner: Runner;
  fsPath: string;

  constructor({
    cmd,
    dir,
    uri,
    runner,
  }: {
    cmd: string;
    dir: string;
    uri: vscode.Uri;
    runner: Runner;
  }) {
    this.name = cmd;
    this.dir = dir;
    this.uri = uri;
    this.runner = runner;
    this.fsPath = uri.fsPath;
  }

  get cmd(): string {
    let command = RUN_COMMANDS[this.runner];
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

const getTargetsInFile = async (
  fileUri: vscode.Uri,
  runner: Runner
): Promise<Target[]> => {
  const fileDoc = await vscode.workspace.openTextDocument(fileUri);
  const fileContent = fileDoc.getText();
  const fileName: string | undefined = fileUri.fsPath.split("/").pop();
  if (!fileName) {
    throw new Error("No file name found");
  }
  const fileDir = fileUri.fsPath.replace(fileName, "");
  const regex = /^([a-zA-Z0-9_-]+):/gm;
  const foundTargets: Target[] = [];
  let match;
  while ((match = regex.exec(fileContent)) !== null) {
    const foundTargetCmd = match[1];
    foundTargets.push(
      new Target({
        cmd: foundTargetCmd,
        dir: fileDir,
        uri: fileUri,
        runner,
      })
    );
  }
  return foundTargets;
};

class QuickPickItemTarget implements vscode.QuickPickItem {
  constructor(public target: Target) {}

  get label(): string {
    return `Run Target: ${this.target.name}`;
  }

  get description(): string {
    return getRelativeUri(this.target.uri);
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
  const pattern = `{**/${FILE_PATTERNS[runner].join(",**/")}}`; // e.g. {**/Makefile,**/*.mk} for [Makefile, *.mk]
  const excludePattern = `{**/${EXCLUDE_DIRS.join(",")}/**}`; // e.g. {**/node_modules/**,**/.git/**} for [node_modules, .git]
  const filesUris = await vscode.workspace.findFiles(pattern, excludePattern);

  let items: vscode.QuickPickItem[] = [];
  for (const fileUri of filesUris) {
    items.push({
      label: getRelativeUri(fileUri),
      kind: vscode.QuickPickItemKind.Separator,
    });
    for (const target of await getTargetsInFile(fileUri, runner)) {
      items.push(new QuickPickItemTarget(target));
    }
  }
  return items;
};

const showQuickPick = (items: vscode.QuickPickItem[]) => {
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

const runMakefileTarget = () => async () => {
  const items = await getItems(Runner.Make);
  showQuickPick(items);
};

const runJustfileTarget = () => async () => {
  const items = await getItems(Runner.Just);
  showQuickPick(items);
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.makefiles.runTarget",
      runMakefileTarget()
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.justfiles.runTarget",
      runJustfileTarget()
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
