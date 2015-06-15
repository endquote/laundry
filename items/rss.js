'use strict';

// Item which describes an RSS object

ns('Items', global);
Items.RSS = function(config) {
    Item.call(this, config);
};

Items.RSS.prototype = _.create(global.Item.prototype);

module.exports = Items.RSS;