# Targets Runner

Run targets from Makefiles and [justfiles](https://github.com/casey/just) in VSCode.
Download from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=mazenb.mk-targets-runner).

# Features

## Inline runner

![](https://raw.githubusercontent.com/mazenbesher/mk-targets-runner/main/doc/inline-runner.png)

Can be disabled via `mk-targets-runner.enableInlineTargetRunner`.

## Run targets from quickpick menu

![](https://raw.githubusercontent.com/mazenbesher/mk-targets-runner/main/doc/demo.gif)

## Other features

- Re-run last target
- Support for [`justfile`-comments](https://github.com/casey/just#documentation-comments) (shown as description in the picker)
- Run included files from correct file. 
  - Example: if variable is defined in a file and then a target is included that uses this variable, the variable is not defined in the included file!

# Configurations

<!-- START_CONFIG_TABLE -->

| Property | Description | Type | Default Value |
| - | - | - | - |
| `mk-targets-runner.command.make` | The command to run makefiles targets. | `string` | `make -C <dir> -f <fsPath> <name>` |
| `mk-targets-runner.command.just` | The command to run justfiles targets. | `string` | `just -d <dir> -f <fsPath> <name>` |
| `mk-targets-runner.dryrun.make` | The command to run makefiles targets in dry-run mode. | `string` | `make -C <dir> -f <fsPath> --dry-run <name>` |
| `mk-targets-runner.dryrun.just` | The command to run justfiles targets in dry-run mode. | `string` | `just -d <dir> -f <fsPath> --dry-run <name>` |
| `mk-targets-runner.filePattern.make` | The glob patterns to match makefiles. | `array` | `['Makefile', '*.mk']` |
| `mk-targets-runner.filePattern.just` | The glob patterns to match justfiles. | `array` | `['justfile', '*.just']` |
| `mk-targets-runner.excludedFoldersPatterns` | The glob patterns to exclude folders. | `array` | `['**/.git', '**/node_modules']` |
| `mk-targets-runner.enableInlineTargetRunner` | Enable inline target runner. | `boolean` | `True` |

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
- [ ] Inline hint to run targets in included file (from this file) with a quickpick menu to select the target from the included file
# Useful links

- [Codicon icon font](https://microsoft.github.io/vscode-codicons/dist/codicon.html)
