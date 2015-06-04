var Backbone = require('Backbone'); // http://backbonejs.org/
var fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
var path = require('path'); // https://nodejs.org/api/path.html
var chalk = require('chalk'); // https://github.com/sindresorhus/chalk
var touch = require('touch'); // https://github.com/isaacs/node-touch

var Washer = Backbone.Model.extend({

    // Defaults properties are configurable and saved to disk.
    defaults: {
        name: null,
    },

    input: null,
    output: null,

    doAuthorize: function() {},
    doInput: function() {},
    doOutput: function() {}
}, {
    // Get instances of all available washers.
    getAllWashers: function(callback) {
        if (!callback) {
            return;
        }

        var washers = [];
        var p = path.join(__dirname, 'washers');
        fs.readdir(p, function(err, files) {
            files.forEach(function(file) {
                var file = path.resolve(path.join(p, file));
                if (path.extname(file) === '.js') {
                    var w = require(file);
                    washers.push(new w());
                }
            });

            callback(washers);
        });
    },

    // Attempt to coerce configuration values into valid values.
    validateField: function(type, value, callback) {
        if (!type || !callback) {
            return;
        }

        value = chalk.stripColor(value).trim();

        if (type == 'file') {
            fs.mkdirp(path.dirname(value), function(err) {
                if (err) {
                    callback(null);
                    return;
                }

                touch(value, {}, function(err) {
                    callback(err ? null : value);
                });
            });

        } else if (type == 'integer') {
            value = parseInt(value);
            callback(isNaN(value) ? null : value);

        } else if (type == 'url') {
            var rx = new RegExp(/([-a-zA-Z0-9^\p{L}\p{C}\u00a1-\uffff@:%_\+.~#?&//=]{2,256}){1}(\.[a-z]{2,4}){1}(\:[0-9]*)?(\/[-a-zA-Z0-9\u00a1-\uffff\(\)@:%,_\+.~#?&//=]*)?([-a-zA-Z0-9\(\)@:%,_\+.~#?&//=]*)?/i);
            callback(rx.test(value) ? value : null);

        } else {
            callback(value);
        }
    }
});

module.exports = Washer;