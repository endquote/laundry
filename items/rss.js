'use strict';

// Item which describes an RSS object

ns('Items', global);
Items.RSS = function(config) {
    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.RSS.prototype = Object.create(Item.prototype);
Items.RSS.className = Helpers.buildClassName(__filename);

// An object passed to async.parallel() which handles downloading of files.
// prefix: the directory at which the download will end up, use to construct the target
// obj: the API response representing the post
// washer: the parent washer, in case you need properties from it
// cache: already downloaded files, pass to downloadUrl
// download: pass to downloadUrl
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