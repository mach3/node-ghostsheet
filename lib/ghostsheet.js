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
     * - {String} url ... Ejs template for spreadsheet url
     * - {Array} types ... Types for column values
     */
    defaults: {
        url: "https://spreadsheets.google.com/feeds/cells/<%=id %>/public/basic?alt=json",
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
     * Get spreadsheet data, pass it to callback
     * @param {String} id
     * @param {Function} callback
     */
    get: function(id, callback) {
        var my = this;
        this._getRemote(id, function(json) {
            callback(my._parse(json));
        });
        return this;
    },

    /**
     * Utilities
     * ---------
     */

    /**
     * Get remote resource, pass the body to callback
     * @param {String} id
     * @param {Function} callback
     */
    _getRemote: function(id, callback) {
        var url = _.template(this.config("url"), {
            id: id
        });
        https.get(url, function(res) {
            var content = [];
            res.setEncoding("utf8");
            res.on("data", function(data) {
                content.push(data);
            });
            res.on("end", function() {
                callback(content.join(""));
            });
        }).on("error", function() {
            throw new Error("Failed to load remote data: " + id);
        });
    },

    /**
     * Parse the spreadsheet data
     * @param {String} json
     * @returns {Object}
     */
    _parse: function(json) {
        var vars, data, my = this;

        data = JSON.parse(json);

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
            r = pos.row - 1;
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