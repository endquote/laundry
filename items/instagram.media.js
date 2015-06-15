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

    Item.call(this, config);
};

Items.Instagram.Media.prototype = _.create(global.Item.prototype);

module.exports = Items.Instagram.Media;