// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// globals
// TODO: make configurable
const EXCLUDE_DIRS = ["node_modules", ".git"];

// class to hold target information
class Target {
  cmd: string;
  dir: string;
  uri: vscode.Uri;

  constructor({
    cmd,
    dir,
    uri,
  }: {
    cmd: string;
    dir: string;
    uri: vscode.Uri;
  }) {
    this.cmd = cmd;
    this.dir = dir;
    this.uri = uri;
  }

  // getter for relative path label (relative path to workspace root or "root" if it is the workspace root)
  get relativePathLabel(): string {
    let relativePathLabel = vscode.workspace.asRelativePath(this.uri);

    const workspaceRoot = vscode.workspace.getWorkspaceFolder(this.uri);
    if (!workspaceRoot) {
      // doesn't match any workspace folder
      return relativePathLabel;
    }

    // if relative path is the same as the workspace root
    if (relativePathLabel === workspaceRoot.name + "/") {
      relativePathLabel = "root";
    }

    return relativePathLabel;
  }

  // getter for label (target name + relative path to workspace)
  get label(): string {
    return `${this.cmd} (${this.relativePathLabel})`;
  }
}

const getTargetsInFile = async (fileUri: vscode.Uri): Promise<Target[]> => {
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
      })
    );
  }
  return foundTargets;
};

const detectTargets = async (pattern: string): Promise<Target[]> => {
  const excludePattern = `{**/${EXCLUDE_DIRS.join(",")}/**}`;
  const filesUris = await vscode.workspace.findFiles(pattern, excludePattern);
  let targets: Target[] = [];
  for (const fileUri of filesUris) {
    for (const foundTarget of await getTargetsInFile(fileUri)) {
      targets.push(
        new Target({
          cmd: foundTarget.cmd,
          dir: foundTarget.dir,
          uri: fileUri,
        })
      );
    }
  }
  return targets;
};

enum Runner {
  Make = "make",
  Just = "just",
}

const runTarget =
  (context: vscode.ExtensionContext, runner: Runner) =>
  async (target: Target) => {
    // send command to terminal if it exists or create one and send command
    let terminal = vscode.window.activeTerminal;
    if (!terminal) {
      terminal = vscode.window.createTerminal();
    }
    terminal.show();
    if (runner === Runner.Just) {
      terminal.sendText(`just -f ${target.uri.fsPath} ${target.cmd}`);
      return;
    }
    if (runner === Runner.Make) {
      terminal.sendText(`make -f ${target.uri.fsPath} ${target.cmd}`);
      return;
    }

    throw new Error("Unknown runner");
  };

const showQuickPick = (
  context: vscode.ExtensionContext,
  targets: Target[],
  runner: Runner
) => {
  const options: {
    [key: string]: (context: vscode.ExtensionContext) => Promise<void>;
  } = {};
  for (const target of targets) {
    options[`Run Target: ${target.label}`] = async (
      context: vscode.ExtensionContext
    ) => {
      await runTarget(context, runner)(target);
    };
  }

  const quickPick = vscode.window.createQuickPick();
  quickPick.items = Object.keys(options).map((label) => ({ label }));
  quickPick.onDidChangeSelection((selection) => {
    if (selection[0]) {
      options[selection[0].label](context).catch(console.error);
      quickPick.dispose(); // Disposes the quick pick after an item is selected
    }
  });
  quickPick.onDidHide(() => quickPick.dispose());
  quickPick.show();
};

const runMakefileTarget = (context: vscode.ExtensionContext) => async () => {
  const targets: Target[] = await detectTargets("{**/Makefile,**/*.mk}");
  showQuickPick(context, targets, Runner.Make);
};

const runJustfileTarget = (context: vscode.ExtensionContext) => async () => {
  const targets: Target[] = await detectTargets("{**/justfile,**/*.just}");
  showQuickPick(context, targets, Runner.Just);
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.makefiles.runTarget",
      runMakefileTarget(context)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mk-targets-runner.justfiles.runTarget",
      runJustfileTarget(context)
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
