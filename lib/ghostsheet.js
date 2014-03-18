/**
 * Ghostsheet.js for Node.js
 * -------------------------
 * Fetch and parse remote spreadsheet as an object
 *
 * @version 0.1.0
 * @author mach3 <http://github.com/mach3>
 * @license MIT
 */

var _ = require("underscore"),
    https = require("https");

/**
 * Extend underscore
 */
_.extend(_, {
    type: function(obj) {
        var m = Object.prototype.toString.call(obj).match(/^\[object\s(.+)\]$/);
        return m ? m[1].toLowerCase() : null;
    }
});

/**
 * Ghostsheet
 * @class Fetch remote spreadsheet resource
 */
var Ghostsheet = function() {
    this.initialize.apply(this, arguments);
};

_.extend(Ghostsheet.prototype, {

    /**
     * Defaults for options
     * - {String} url_list ... Ejs template for URL to fetch worksheet list
     * - {String} url_sheet ... Ejs template for URL to get worksheet data
     * - {Array} types ... Types for column values
     * - {Boolean} nullfill ... Fill empty columns with `null` or not
     */
    defaults: {
        url_list: "https://spreadsheets.google.com/feeds/worksheets/<%=key %>/public/basic?alt=json",
        url_sheet: "https://spreadsheets.google.com/feeds/cells/<%=id %>/public/basic?alt=json",
        types: [
            "string",
            "int",
            "integer",
            "number",
            "array",
            "bool",
            "boolean",
            "json"
        ],
        nullfill: true
    },
    options: {},

    /**
     * Initialize
     * @constructor
     * @param {Object} options
     */
    initialize: function(options) {
        this.config(this.defaults);
        this.config(options);
    },

    /**
     * Configure options
     * @param {String|Object} key|options
     * @param {*} value
     * @return {*}
     */
    config: function() {
        var args, my = this;
        args = Array.prototype.slice.call(arguments);
        if (!args.length) {
            return this.options;
        }
        switch (_.type(args[0])) {
            case "string":
                if (args.length > 1) {
                    this.options[args[0]] = args[1];
                    return this;
                }
                return this.options[args[0]];
            case "object":
                _.each(args[0], function(value, key) {
                    my.config(key, value);
                });
                return this;
            default:
                break;
        }
        return this;
    },


    /**
     * Get worksheet list by Spreadsheet Key
     * @param {String} key
     */
    list: function(key, callback) {
        var url = _.template(this.config("url_list"), {key: key});
        this._fetch(url, function(data){
            var list = [];
            data.feed.entry.forEach(function(item){
                list.push({
                    title: item.title.$t,
                    id: item.id.$t.replace(/.+\//, "")
                });
            });
            callback(list);
        });
    },

    /**
     * Get spreadsheet data, pass it to callback
     * `name` is index number or name string of worksheet
     * @param {String} key
     * @param {Integer|String} name (optional)
     * @param {Function} callback
     */
    get: function(key, name, callback) {
        var process, my = this;

        process = function(id){
            var url = _.template(my.config("url_sheet"), {id: id});
            my._fetch(url, function(data){
                callback(my._parse(data));
            });
        };
        if(_.isFunction(name)){
            callback = name;
            name = 0;
        }
        if(/\/\w+$/.test(key)){
            process(key);
            return this;
        }
        this.list(key, function(list){
            process([key, my._getSheetId(name, list)].join("/"));
        });
        return this;
    },

    /**
     * Utilities
     * ---------
     */

    /**
     * Fetch remote source by url, pass the body to callback
     * @param {String} url
     * @param {Function} callback
     */
    _fetch: function(url, callback){
        https.get(url, function(res){
            var content = [];
            res.setEncoding("utf8");
            res.on("data", function(data){
                content.push(data);
            });
            res.on("end", function(){
                callback(JSON.parse(content.join("")));
            });
        })
        .on("error", function(){
            throw new Error("Failed to fetch remote resource:" + url);
        });
    },

    /**
     * Get worksheet ID from list by index or name
     * @param {String|Integer} name
     * @param {Array} list
     */
    _getSheetId: function(name, list){
        var id = null;
        if(_.isNumber(name) && !! list[name]){
            return list[name].id;
        }
        list.forEach(function(data, i){
            if(! id && data.title === name){
                id = data.id;
            }
        });
        if(! id){
            throw new Error("Invalid worksheet index/name: " + name);
        }
        return id;
    },

    /**
     * Parse the spreadsheet data
     * @param {Object} data
     * @returns {Object}
     */
    _parse: function(data) {
        var vars, my = this;

        if (_.type(data.feed.entry) !== "array") {
            throw new Error("Parse error");
        }

        vars = {
            id: data.feed.id.$t,
            updated: new Date(data.feed.updated.$t),
            title: data.feed.title.$t,
            headers: {},
            items: []
        };

        data.feed.entry.forEach(function(col) {
            var pos, r, label;

            pos = my._getPosition(col);
            r = pos.row - 2;
            label = vars.headers[pos.col];

            if (pos.row === 1) {
                return vars.headers[pos.col] = my._parseHeader(col);
            }
            if (label) {
                if (!vars.items[r]) {
                    vars.items[r] = {};
                }
                vars.items[r][label.name] = my._juggle(col, label.type);
            }
        });
        return vars;
    },

    /**
     * Get position of the column by its title
     * @param {Object} col
     * @returns {Object}
     */
    _getPosition: function(col) {
        var m = col.title.$t.match(/^([A-Z]+)([\d]+$)/);
        return !m ? null : {
            col: m[1],
            row: parseInt(m[2], 10)
        };
    },

    /**
     * Parse header label
     * @param {Object} col
     * @returns {Object}
     */
    _parseHeader: function(col) {
        var m = col.content.$t.match(/(\w+)\:(\w+)/);
        if (!m) {
            return {
                type: "string",
                name: col.content.$t
            };
        }
        return {
            type: this.config("types").indexOf(m[2]) >= 0 ? m[2] : "string",
            name: m[1]
        };
    },

    /**
     * Juggle the type of the column's value
     * @param {Object} col
     * @param {String} type
     */
    _juggle: function(col, type) {
        var value = col.content.$t;
        if (this.config("nullfill") && value === "") {
            return null;
        }
        switch (type) {
            case "int":
            case "integer":
                return parseInt(value, 10);
            case "number":
                return Number(value);
            case "array":
                return value.split(",");
            case "boolean":
            case "bool":
                return (/^TRUE$/i).test(value);
            case "json":
                return JSON.parse(value);
            default:
                return col.content.$t;
        }
    }

});


module.exports = Ghostsheet;