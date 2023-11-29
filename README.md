# Targets Runner

Run targets from Makefiles and [justfiles](https://github.com/casey/just) in VSCode.
Download from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=mazenb.mk-targets-runner).

![](https://raw.githubusercontent.com/mazenbesher/mk-targets-runner/main/doc/demo.gif)

## Expected files patters

For makefiles:

- `Makefile`
- `*.mk`

For justfiles:

- `justfile`
- `*.just`

Configurable in the extension settings `mk-targets-runner.filePattern`.

# Features

- Separator per file
- Support for [`justfile`-comments](https://github.com/casey/just#documentation-comments) (shown as description in the picker)
- Run included files from correct file. Example: if variable is defined in a file and then a target is included that uses this variable, the variable is not defined in the included file!

# Configurations
- For excluded files `mk-targets-runner.excludedFoldersPatterns` (default: `["**/node_modules", "**/.git"]`)
- For run-commands (now they are `make -f <file> <target>` and `just -f <file> <target>`)

## TODO

- [ ] Timeout for finding targets
