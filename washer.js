/* jslint node: true */
/* jshint strict: true */
'use strict';

var chalk = require('chalk'); // https://github.com/sindresorhus/chalk
var touch = require('touch'); // https://github.com/isaacs/node-touch

// Base class for washers. Washers can accept input from the web, parse it into general-purpose objects,
// and return it to other washers which output those objects to other formats.
var Washer = function(config) {

    // The user-facing name of the washer.
    this.name = null;

    // The internal name.
    this.classFile = path.basename(__filename);

    // An object describing the input function of this washer, if any. It contains a user-facing
    // description of the functionality, and an array of settings required to configure it.
    /*
        description: 'Loads data from an RSS feed.',
        settings: [{
            name: 'url',
            type: 'url',
            prompt: 'What RSS feed URL do you want to launder?'
        }]
    */
    this.input = null;

    // An object describing the output function of this washer, if any. Format is the same
    // as input.
    this.output = null;

    // Any configuration object passed in is copied as public properties of the class.
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
    delete c.name;
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

        washers = _.sortBy(washers, 'name');

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