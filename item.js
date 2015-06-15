'use strict';

// Basic class representing an item from anywhere.
var Item = function(config) {
    this.title = null;
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

Item.prototype.buildDescription = function() {
    this.description = '';
};

module.exports = Item;