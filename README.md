# Targets Runner

Run targets from Makefiles and [justfiles](https://github.com/casey/just) in VSCode.

Demo: <video src="demo.mp4" controls></video>

## Expected files patters

For makefiles:

- `Makefile`
- `*.mk`

For justfiles:

- `justfile`
- `*.just`

TODO: Can be configured in settings.

# Features

- Separator per file
- Support for [`justfile`-comments](https://github.com/casey/just#documentation-comments) (shown as description in the picker)

## TODO

- [ ] Configurations for:
  - [ ] excluded files
  - [ ] matching patterns and regexes
  - [ ] run-commands (now they are `make -f <file> <target>` and `just -f <file> <target>`)
