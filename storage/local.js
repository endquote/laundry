'use strict';

ns('Storage', global);
Storage.Local = function() {};

Storage.Local.readFileString = function(target, callback) {
    fs.readFile(target, {
        encoding: 'utf8'
    }, callback);
};

Storage.Local.writeFile = function(target, contents, callback) {
    target = path.join(commander.local, target);
    var dir = path.parse(target).dir;
    fs.mkdirp(dir, function(err) {
        if (err) {
            callback(err);
            return;
        }
        fs.writeFile(target, contents, callback);
    });
};

module.exports = Storage.Local;
