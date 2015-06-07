'use strict';

ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    Item.call(this, config);
};

Items.Google.YouTube.Video.prototype = _.create(Item.prototype, {
    constructor: Items.Google.YouTube.Video
});

module.exports = Items.Google.YouTube.Video;