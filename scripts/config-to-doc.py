"""
Read the properties of the configuration in the contributes section of the package.json file 
and convert them to a markdown table with the following format: Property, Description, Type, Default Value
The description is taken from the markdownDescription attribute if it exists, otherwise it is taken from the
 description attribute. If this attribute is multi-line, only the first line is taken.
"""
import json

with open("package.json") as json_file:
    data = json.load(json_file)
contributes = data["contributes"]
configuration = contributes["configuration"]
properties = configuration["properties"]

tbl = "| Property | Description | Type | Default Value |\n"
tbl += "| - | - | - | - |\n"

for key, value in properties.items():
    description = (
        value["markdownDescription"]
        if "markdownDescription" in value
        else value["description"]
    )
    description = description.split("\n")[0]
    tbl += f'| `{key}` | {description} | `{value["type"]}` | `{value["default"]}` |\n'

with open("README.md", "r+") as readme_file:
    readme = readme_file.read()
    start = readme.find("<!-- START_CONFIG_TABLE -->")
    start += len("<!-- START_CONFIG_TABLE -->")
    end = readme.find("<!-- END_CONFIG_TABLE -->")
    readme_file.seek(0)
    readme_file.write(readme[:start] + "\n\n" + tbl + "\n" + readme[end:])
