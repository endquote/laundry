'use strict';

// Item which describes an RSS object

ns('Items', global);
Items.RSS = function(config) {
    this.title = null;
    this.description = null;
    this.url = null;
    this.date = null;
    this.author = null;
    this.tags = null;

    Item.call(this, config);
};

Items.RSS.prototype = _.create(global.Item.prototype);

module.exports = Items.RSS;