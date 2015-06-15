'use strict';

var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client
var touch = require('touch'); // https://github.com/isaacs/node-touch
var chalk = require('chalk'); // https://github.com/sindresorhus/chalk

// Misc static helper functions.
function Helpers() {}

// Shorten a string to be less than a given length, ending in an ellipsis, trying to break on whole words.
Helpers.shortenString = function(s, len) {
    s = s.trim();

    if (!s) {
        return '';
    }

    if (s.length <= len) {
        return s;
    }

    while (s.length >= len) {
        if (s.indexOf(' ') === -1) {
            s = s.substring(0, len - 1);
            break;
        } else {
            s = s.substring(0, s.lastIndexOf(' '));
        }

    }
    s += '…';
    return s;
};

// Shorten a URL using the Google URL shortner API.
// https://developers.google.com/url-shortener/v1/
Helpers.shortenUrl = function(url, callback) {
    if (!url || !callback) {
        return;
    }

    google.urlshortener('v1').url.insert({
        resource: {
            longUrl: url
        }
    }, function(err, response) {
        callback(err ? url : response.id);
    });
};

// Given a file path, try to write to it.
Helpers.validateFile = function(file, callback) {
    file = Helpers.cleanString(file);
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

// Remove chalk stuff from a string.
Helpers.cleanString = function(s) {
    if (!s) {
        s = '';
    }
    return chalk.stripColor(s).trim();
};

// Test for empty strings.
validator.extend('isWhitespace', function(str) {
    return /^\s*$/.test(str);
});

// Utility methods
_.oldMerge = _.merge;
_.merge = function(object, sources, customizer, thisArg) {
    return _.oldMerge(object, sources, function(a, b) {
        if (_.isArray(a)) {
            return a.concat(b);
        }
    }, thisArg);
};

module.exports = Helpers;