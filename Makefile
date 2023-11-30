# package extension to .vsix file
package:
	mkdir -p ./dist
	vsce package -o ./dist/

# publish to marketplace
publish:
	vsce publish

# generate config documentation
gen-config-doc:
	@python3 scripts/config-to-doc.py
