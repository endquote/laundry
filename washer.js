var Backbone = require('Backbone'); // http://backbonejs.org/
var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html

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
    }
});

module.exports = Washer;
