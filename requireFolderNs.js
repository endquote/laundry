var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html

// A little helper for loading up a directory full of classes into a namespace.
module.exports = function(folder) {
    var out = {};
    var p = path.resolve(folder);
    fs.readdirSync(p).forEach(function(file) {
        var file = path.resolve(path.join(p, file));
        if (path.extname(file) === '.js') {
            var e = require(file);
            for (var i in e) {
                out[i] = e[i];
            }
        }
    });
    return out;
}