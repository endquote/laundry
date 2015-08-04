'use strict';

// Item which describes an RSS object

ns('Items', global);
Items.RSS = function(config) {
    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.RSS.prototype = Object.create(Item.prototype);
Items.RSS.className = Helpers.buildClassName(__filename);

Items.RSS.factory = function(item) {
    return new Items.RSS(Item.factory(item));
};

module.exports = Items.RSS;
