'use strict';

// Basic class representing an item from anywhere.
var Item = function(config) {
    this.id = null;
    this.title = null;
    this.description = null;
    this.url = null;
    this.date = null;
    this.author = null;
    this.tags = null;
    this.mediaUrl = null;
    this.description = '';

    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
};

Item.factory = function(jobName, objects, callback) {
    callback([]);
};

// Build the S3 object prefix for a media type.
Item.buildPrefix = function(jobName, className) {
    return ('jobs.' + jobName + '.' + className).toLowerCase().split('.').join('/');
};

module.exports = Item;
