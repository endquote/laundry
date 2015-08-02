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

Item.factory = function(item) {
    return new Item({
        title: item.title,
        description: item.description,
        url: item.link,
        date: moment(item.date),
        author: item.author,
        tags: item.categories
    });
};

module.exports = Item;
