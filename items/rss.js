'use strict';

// Item which describes an RSS object

ns('Items', global);
Items.RSS = function(config) {
    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.RSS.prototype = Object.create(Item.prototype);
Items.RSS.className = Helpers.buildClassName(__filename);

Items.RSS.downloadLogic = function(prefix, obj, washer, cache) {
    return {};
};

Items.RSS.factory = function(item, downloads) {
    return new Items.RSS({
        title: item.title,
        description: item.description,
        url: item.link,
        date: moment(item.date),
        author: item.author
    });
};

module.exports = Items.RSS;
