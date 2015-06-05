/* jslint node: true */
/* jshint strict: true */
'use strict';

var fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
var path = require('path'); // https://nodejs.org/api/path.html
var chalk = require('chalk'); // https://github.com/sindresorhus/chalk
var touch = require('touch'); // https://github.com/isaacs/node-touch
var _ = require('lodash'); // https://lodash.com/docs

var Washer = function(config) {
    this.name = null;
    this.input = null;
    this.output = null;

    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
};

// Remove stuff from the washer that's saved to disk.
Washer.prototype.stringify = function() {
    var c = _.clone(this);
    delete c.input;
    delete c.output;
    return c;
};

Washer.prototype.doInput = function(callback) {
    callback(null, []);
};

Washer.prototype.doOutput = function(items, callback) {
    callback(null);
};

// Get instances of all available washers.
Washer.getAllWashers = function(callback) {
    if (!callback) {
        return;
    }

    var washers = [];
    var p = path.join(__dirname, 'washers');
    fs.readdir(p, function(err, files) {
        files.forEach(function(file) {
            file = path.resolve(path.join(p, file));
            if (path.extname(file) === '.js') {
                var W = require(file);
                washers.push(new W());
            }
        });

        callback(washers);
    });
};

// Attempt to coerce configuration values into valid values.
Washer.validateField = function(type, value, callback) {
    if (!type || !callback) {
        return;
    }

    value = chalk.stripColor(value).trim();

    if (type == 'file') {
        value = path.resolve(value);
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
};

module.exports = Washer;