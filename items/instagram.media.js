'use strict';

// Item which describes an Instagram object

ns('Items.Instagram', global);
Items.Instagram.Media = function(config) {
    this.type = null;
    this.comments = null;
    this.likes = 0;
    this.image = null;
    this.caption = null;
    this.authorpic = null;
    this.liked = false;

    Item.call(this, config);
};

Items.Instagram.Media.prototype = _.create(global.Item.prototype);

Items.Instagram.Media.prototype.buildDescription = function() {
    this.description = '';
};

module.exports = Items.Instagram.Media;