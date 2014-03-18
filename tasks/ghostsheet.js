/**
 * Grunt task for ghostsheet.js
 * ----------------------------
 */
module.exports = function(grunt){

	grunt.registerMultiTask("ghostsheet", "Fetch spreadsheet, save it as jSON", function(){

		var done = this.async(),
			length = this.files.length,
			Ghostsheet = require("../lib/ghostsheet"),
			gs = new Ghostsheet(),
			fs = require("fs"),
			beautify = require("js-beautify"),
			options = this.options({
				beautify: false,
				callback: null
			}),
			_ = grunt.util._;

		this.files.forEach(function(item){
			if(! _.isArray(item.orig.src) || ! item.orig.src.length){
				return grunt.log.error("Invalid spreadsheet ID: " + item.orig.src);
			}
			gs.get(item.orig.src[0], function(data){
				var json = JSON.stringify(data);
				if(_.isString(options.callback)){
					json = options.callback + "(" + json + ");";
				}
				if(options.beautify){
					json = beautify.js_beautify(json);
				}
				fs.writeFileSync(item.dest, json);
				if(! -- length){
					done();
				}
			});
		});
	});

};

