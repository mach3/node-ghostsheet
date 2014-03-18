
# node-ghostsheet

Library to fetch and parse remote spreadsheet as an object for Node.js.
(JavaScript implement of [Ghostsheet on PHP](http://github.com/mach3/ghostsheet))

## Usage

```javascript
var Ghostsheet = require("ghostsheet");
var gs = new Ghostsheet();

// Get by key and index of worksheet
gs.get("xXXXXxxxXXXx", 0, function(data){
    console.log(data);

    // Save it as JSON file
    require("fs").writeFileSync("./my-spreadsheet-data.json", JSON.stringify(data));
});

// Get by key and worksheet's name
gs.get("xXXXXxxxXXXx", "my_sheet", function(data){ ... });

// Get by Full ID
gs.get("xXXXXxxxXXXXx/XxX", function(data){ ... });
```

- This doesn't have any interfaces for caching, as Ghostsheet on PHP so.
- About label for each columns, see [Ghostsheet](http://github.com/mach3/ghostsheet)

## Grunt Task

Interface for grunt.

```javascript
grunt.initConfig({
	ghostsheet: {
		options: {
			beautify: false
		},
		dev: {
			files: {
				"assets/json/foo.json": "xXXXXxxxXXXXx/XxX", // Full ID
                "assets/json/bar.json": ["xXXXXxxxXXXXx", 0], // Key and Index
                "assets/json/baz.json": ["xXXXXxxxXXXXx", "my_sheet"], // Key and Name
                "assets/json/foobar.json": "xXXXXxxxXXXXx" // Ommit Index (0)
			}
		}
	}
});

grunt.loadNpmTasks("node-ghostsheet");
```

## options

- beautify :Boolean (false) - Beautify JSON or not
- callback :String (null) - Callback function name for JSONP
