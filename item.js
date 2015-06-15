'use strict';

// Basic class representing an item from anywhere.
var Item = function(config) {
    this.title = null;
    this.description = null;
    this.url = null;
    this.date = null;
    this.author = null;
    this.tags = null;

    this.description = '';

    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
};

// Shorten a string to be less than a given length, ending in an ellipsis, trying to break on whole words.
Item.shorten = function(s, len) {
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

module.exports = Item;