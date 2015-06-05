/* jslint node: true */
/* jshint strict: true */
'use strict';

// Basic class representing an item from anywhere.
var Item = function(config) {
    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
};

module.exports = Item;