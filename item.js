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

// Build an HTML video player.
Item.buildVideo = function(videoUrl, thumbUrl) {
    if (thumbUrl) {
        return util.format('<p><video controls poster="%s" src="%s" autobuffer="false" preload="none"></video></p>', thumbUrl, videoUrl);
    } else {
        return util.format('<p><video controls src="%s" autobuffer="false" preload="none"></video></p>', videoUrl);
    }
};

// Build an HTML audio player.
Item.buildAudio = function(audioUrl) {
    return util.format('<p><audio controls preload="none" src="%s" /></p>', audioUrl);
};

module.exports = Item;
