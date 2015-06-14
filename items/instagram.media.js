'use strict';

// Item which describes an Instagram object

ns('Items.Instagram', global);
Items.Instagram.Media = function(config) {
    this.tags = null;
    this.type = null;
    this.comments = null;
    this.date = null;
    this.link = null;
    this.likes = 0;
    this.image = null;
    this.caption = null;
    this.username = null;
    this.userpic = null;
    this.liked = false;

    Item.call(this, config);
};

Items.Instagram.Media.prototype = _.create(global.Item.prototype);

module.exports = Items.Instagram.Media;