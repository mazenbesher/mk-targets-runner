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

## TODO

- [ ] Support for `justfile`-syntax comments
    - Idea: Show them as description in the picker
- [ ] Configurations for:
  - [ ] excluded files
  - [ ] matching patterns and regexes
  - [ ] run-commands (now they are `make -f <file> <target>` and `just -f <file> <target>`)
- [x] Generator `getTargetsInFile`
