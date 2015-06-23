'use strict';

// Item which describes an RSS object

ns('Items', global);
Items.RSS = function(config) {
    Item.call(this, config);
};

Items.RSS.prototype = _.create(global.Item.prototype);

Items.RSS.factory = function(item) {
    return new Items.RSS({
        title: item.title,
        description: item.description,
        url: item.link,
        date: moment(item.date),
        author: item.author,
        tags: item.categories
    });
};

module.exports = Items.RSS;