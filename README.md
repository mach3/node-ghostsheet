
# node-ghostsheet

Library to fetch and parse remote spreadsheet as an object for Node.js.
(JavaScript implement of [Ghostsheet on PHP](http://github.com/mach3/ghostsheet))

## Usage

```
var Ghostsheet = require("ghostsheet");
var gs = new Ghostsheet();

gs.get("xXXXXxxxXXXXx/XxX", function(data){
    console.log(data);

    // Save it as JSON file
    require("fs").writeFileSync("./my-spreadsheet-data.json", JSON.stringify(data));
});
```

- This doesn't have any interfaces for caching, as Ghostsheet on PHP so.
- About label for each columns, see [Ghostsheet](http://github.com/mach3/ghostsheet)
