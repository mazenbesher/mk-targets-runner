# Target with \
#   multi line comment
multi-line-comment-with-slash:
	@echo "multi-line-comment-with-slash"

dump-as-json:
	just -f complex.just --dump --dump-format json | jq > complex.json

# comment with a space at the end 
space-at-end-of-comment:
	@echo "This target has a comment with a space at the end "

# line 1
#  line 2
multi-line-comment:
	@echo "multi-line-comment"

# comment with slash \
slash:
	@echo "This target has a slashed comment"

# comment with slash and space \ 
slash-and-space:
	@echo "This target has a slashed comment with space"

[confirm]
confirmable-target:
	@echo "Confirmable target"

tricky-target:
	@echo "This\
	# target \
	target: tries to trick the regex!"
