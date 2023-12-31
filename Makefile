# package extension to .vsix file
package:
	mkdir -p ./dist
	vsce package -o ./dist/

# publish to marketplace
publish:
	vsce publish

# complie ts to js in ./out
compile:
	npm run compile

# clean up
clean:
	rm -rf ./out

# generate config documentation
gen-config-doc:
	@python3 scripts/config-to-doc.py

# setup pre-commit hooks
pre-commit:
	mkdir -p .githooks
	git config core.hooksPath .githooks
	touch .githooks/pre-commit
	chmod +x .githooks/pre-commit
