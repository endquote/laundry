'use strict';

// Item which describes a YouTube video

ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    this.thumbnail = null;

    Item.call(this, config);
};

Items.Google.YouTube.Video.prototype = _.create(Item.prototype);

Items.Google.YouTube.Video.prototype.buildDescription = function() {};

module.exports = Items.Google.YouTube.Video;