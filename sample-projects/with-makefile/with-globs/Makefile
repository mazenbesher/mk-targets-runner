WHO=world

main:
	@echo "main"
	@echo "Hello ${WHO}"

# mk0 and mk1
include *.mk

# mk0
include mk0.mk

# mk1
include mk1.mk

# mk2 and mk3
include makefiles/*.mk

# m4 and mk5
include makefiles/subfolder/*.mk

# mk2, mk3, mk4 and mk5
include makefiles/**/*.mk

# mk0, mk1, mk2, mk3, mk4 and mk5
include **/*.mk

### with parent directory

# target1, target2, target3
include ../Makefile

# target1-inside-mk1, target2-inside-mk1
include ../sub-makefiles/mk1.mk

# target1-inside-mk1, target2-inside-mk1, target1-inside-mk2
include ../sub-makefiles/*.mk

# target1-inside-mk1, target2-inside-mk1, target1-inside-mk2, target1-inside-mk3
include ../sub-makefiles/**/*.mk

### absoulte path

# mk0
include /Users/mazen/Documents/projects/makefile-vscode-ext/mk-targets-runner/sample-projects/with-makefile/with-globs/mk0.mk

# outside workspace
include /Users/mazen/Documents/projects/docker/docker-compose.mk
