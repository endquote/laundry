'use strict';

var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client

// Misc static helper functions.
function Helpers() {}

// Shorten a string to be less than a given length, ending in an ellipsis, trying to break on whole words.
Helpers.shortenString = function(s, len) {
    if (!s) {
        return '';
    }

    s = s.substring(0, s.indexOf(' ', len));
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

module.exports = Helpers;