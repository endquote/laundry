'use strict';

// Item which describes a YouTube video

ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    this.title = null;
    this.description = null;
    this.url = null;
    this.date = null;
    this.author = null;
    this.thumbnail = null;
    Item.call(this, config);
};

Items.Google.YouTube.Video.prototype = _.create(Item.prototype);

module.exports = Items.Google.YouTube.Video;