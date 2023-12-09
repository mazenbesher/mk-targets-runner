<div align="center">
<img src="./icons/ext-icon.png" height="96px"/>

# Targets Runner

Run targets from Makefiles and [justfiles](https://github.com/casey/just) in VSCode.
Download from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=mazenb.mk-targets-runner).

</div>

# Features

## Inline runner

![](./doc/inline-runner.png)

Can be disabled via `mk-targets-runner.enableInlineTargetRunner`.

or from the gutter:

![](./doc/run-target-from-gutter.png)

## Run targets from quickpick menu

![](./doc/demo.gif)

## Run targets in included file

From current file, with a quickpick menu to select the target from the included file.

![](./doc/inline-included.gif)

## Other features

- Re-run last target
- Support for [`justfile`-comments](https://github.com/casey/just#documentation-comments) (shown as description in the picker)
- Run included files from the correct file.
  - Example: if variable is defined in a file and then a target is included that uses this variable, the variable is not defined in the included file!

# Configurations

<!-- START_CONFIG_TABLE -->

| Property                                     | Description                                           | Type      | Default Value                                |
| -------------------------------------------- | ----------------------------------------------------- | --------- | -------------------------------------------- |
| `mk-targets-runner.command.make`             | The command to run makefiles targets.                 | `string`  | `make -C <dir> -f <fsPath> <name>`           |
| `mk-targets-runner.command.just`             | The command to run justfiles targets.                 | `string`  | `just -d <dir> -f <fsPath> <name>`           |
| `mk-targets-runner.dryrun.make`              | The command to run makefiles targets in dry-run mode. | `string`  | `make -C <dir> -f <fsPath> --dry-run <name>` |
| `mk-targets-runner.dryrun.just`              | The command to run justfiles targets in dry-run mode. | `string`  | `just -d <dir> -f <fsPath> --dry-run <name>` |
| `mk-targets-runner.filePattern.make`         | The glob patterns to match makefiles.                 | `array`   | `['Makefile', '*.mk']`                       |
| `mk-targets-runner.filePattern.just`         | The glob patterns to match justfiles.                 | `array`   | `['justfile', '*.just']`                     |
| `mk-targets-runner.excludedFoldersPatterns`  | The glob patterns to exclude folders.                 | `array`   | `['**/.git', '**/node_modules']`             |
| `mk-targets-runner.enableInlineTargetRunner` | Enable inline target runner.                          | `boolean` | `True`                                       |
| `mk-targets-runner.inlineRunnerLocation`     | Where to show the inline target runner.               | `string`  | `target`                                     |

<!-- END_CONFIG_TABLE -->

## TODO

- [ ] Timeout for finding targets
- [ ] Add tasks via the [`TaskProvider`](https://code.visualstudio.com/api/extension-guides/task-provider)
- [ ] Right now the extension uses the activation event `onLanguage` since the extension should be activated for any targetfile type which is dynmically determined. This is not ideal since it will be activated for any file.
- Add support for:
  - [ ] Rakefile
  - [ ] Python typer
- Git hooks for:
  - [ ] Tests
  - [ ] Linting
  - [ ] Configurations generation
- [ ] Add tests
- [ ] Auto increment version with commit and auto append commit messages to `CHANGELOG.md`
- [ ] Show some indication that the extension is working (e.g. spinner) while finding targets

# Useful links

- [Task Provider](https://code.visualstudio.com/api/extension-guides/task-provider)
- icons
  - [Icons for Visual Studio Code](https://github.com/microsoft/vscode-icons)
  - [Codicon icon font](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
- [Testing Extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

# Notes

- To be able to import `glob` it had to be added `dependencies` in `package.json` and **removed from** `devDependencies` from some reason! (see [this](https://stackoverflow.com/a/76257922/1617883)). Otherwise, the extension would not be able to be activated with the following error: "Activating extension failed due to an error Cannot find module 'glob'". Note that this error does not occur when running the extension in debug mode!
