// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// class to hold target information
class Target {
  label: string;
  cmd: string;
  dir: string;
  constructor(label: string, cmd: string, dir: string) {
    this.label = label;
    this.cmd = cmd;
    this.dir = dir;
  }
}

const getTargetsInMakefile = async (
  makefileUri: vscode.Uri
): Promise<Target[]> => {
  const makefileDoc = await vscode.workspace.openTextDocument(makefileUri);
  const makefileContent = makefileDoc.getText();
  const makefileDir = makefileUri.fsPath.replace("Makefile", "");
  const regex = /^([a-zA-Z0-9_-]+):/gm;
  let foundTargets: Target[] = [];
  let match;
  while ((match = regex.exec(makefileContent)) !== null) {
    const foundTargetCmd = match[1];
    foundTargets.push(new Target(foundTargetCmd, foundTargetCmd, makefileDir));
  }
  return foundTargets;
};

const getRelativePathLabel = (path: string, workspaceRoot: string): string => {
  let relativePathLabel = vscode.workspace.asRelativePath(path);

  // if relative path is the same as the workspace root
  if (relativePathLabel === workspaceRoot + "/") {
    relativePathLabel = "root";
  }

  return relativePathLabel;
};

const detectTargets = async (): Promise<Target[]> => {
  const workspaceRoot = vscode.workspace.rootPath;
  if (!workspaceRoot) {
    throw new Error("No workspace root found");
  }

  // find all makefiles in workspace (Makefile or *.mk)
  const makefilesUris = await vscode.workspace.findFiles(
    "{**/Makefile,**/*.mk}",
    "{**/node_modules/**,**/.git/**}" // ignore node_modules and .git
  );
  let targets: Target[] = [];
  let targetCmds: string[] = [];
  for (const makefileUri of makefilesUris) {
    const foundTargets = await getTargetsInMakefile(makefileUri);
    for (const foundTarget of foundTargets) {
      let makefileDir = foundTarget.dir;

      // check if target cmd already exists
      let exists = targetCmds.includes(foundTarget.cmd);

      if (!exists) {
        targetCmds.push(foundTarget.cmd);
        targets.push(new Target(foundTarget.cmd, foundTarget.cmd, makefileDir));
      } else {
        // if it does not exist, check if it clashes with another target
        let clashes = false;
        for (const i in targets) {
          const target = targets[i];
          if (target.cmd === foundTarget.cmd && target.dir !== makefileDir) {
            clashes = true;

            // change label of existing target to include its relative path to the workspace
            targets[i].label = `${target.cmd} (${getRelativePathLabel(
              target.dir,
              workspaceRoot
            )})`;
          }
        }

        if (clashes) {
          targets.push(
            new Target(
              `${foundTarget.cmd} (${getRelativePathLabel(
                makefileDir,
                workspaceRoot
              )})`,
              foundTarget.cmd,
              makefileDir
            )
          );
        }
      }
    }
  }
  return targets;
};

const runTarget =
  (context: vscode.ExtensionContext) => async (target: Target) => {
    // send command to terminal if it exists or create one and send command
    let terminal = vscode.window.activeTerminal;
    if (!terminal) {
      terminal = vscode.window.createTerminal();
    }
    terminal.show();
    terminal.sendText(`cd ${target.dir}`);
    terminal.sendText(`make ${target.cmd}`);
  };

const main = (context: vscode.ExtensionContext) => async () => {
  const targets: Target[] = await detectTargets();

  // populate options
  const options: {
    [key: string]: (context: vscode.ExtensionContext) => Promise<void>;
  } = {};
  for (const target of targets) {
    options[`Run Target: ${target.label}`] = async (
      context: vscode.ExtensionContext
    ) => {
      await runTarget(context)(target);
    };
  }

  // show quick pick
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

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("mk-targets-runner.makefiles.runTarget", main(context))
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
