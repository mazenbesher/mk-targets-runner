WHO=world

# should be targets from mk0 and mk1
include *.mk

# should be only mk0 targets
include mk0.mk

# should be only mk1 targets
include mk1.mk

# should be targets from mk2 and mk3
include makefiles/*.mk

# should be m4 and mk5 targets
include makefiles/subfolder/*.mk

# should be targets from mk2, mk3, mk4 and mk5
include makefiles/**/*.mk

# all targets!
include **/*.mk
