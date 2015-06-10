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
            prompt: 'What RSS feed URL do you want to launder?',
            beforeEntry: function(callback),
            afterEntry: function(oldValue, newValue, callback(err))
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
    for (var i in c) {
        if (i.indexOf('_') === 0) {
            delete(c[i]);
        }
    }
    return c;
};

Washer.prototype.doInput = function(callback) {
    callback(null, []);
};

Washer.prototype.doOutput = function(items, callback) {
    callback(null);
};

Washer.cleanString = function(s) {
    if (!s) {
        s = '';
    }
    return chalk.stripColor(s).trim();
};

Washer.validateString = function(s) {
    s = Washer.cleanString(s);
    return s ? true : false;
};

Washer.validateFile = function(file, callback) {
    file = Washer.cleanString(file);
    file = path.resolve(file);
    fs.mkdirp(path.dirname(file), function(err) {
        if (err) {
            callback(null);
            return;
        }

        touch(file, {}, function(err) {
            callback(err ? false : true);
        });
    });
};

Washer.validateUrl = function(url, callback) {
    url = Washer.cleanString(url);
    var rx = new RegExp(/([-a-zA-Z0-9^\p{L}\p{C}\u00a1-\uffff@:%_\+.~#?&//=]{2,256}){1}(\.[a-z]{2,4}){1}(\:[0-9]*)?(\/[-a-zA-Z0-9\u00a1-\uffff\(\)@:%,_\+.~#?&//=]*)?([-a-zA-Z0-9\(\)@:%,_\+.~#?&//=]*)?/i);
    callback(rx.test(url) ? true : false);
};

module.exports = Washer;