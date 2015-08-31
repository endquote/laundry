'use strict';

// Basic class representing an item from anywhere.
var Item = function(config) {
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

// An object passed to async.parallel() which handles downloading of files.
Item.downloadLogic = function(prefix, obj, params) {
    return {};
};

// Given a collection of API responses, perform downloads and construct Item objects.
Item.download = function(itemClass, washer, objects, callback) {
    var prefix = Item.buildPrefix(washer._job.name, itemClass.className);
    var items = [];
    var cache = [];

    washer.downloadMedia = false;

    async.waterfall([
        // Cache existing newKeys so they're not uploaded again.
        function(callback) {
            if (washer.downloadMedia) {
                Storage.cacheFiles(prefix, function(err, c) {
                    cache = c;
                    callback(err);
                });
            } else {
                callback();
            }
        },

        function(callback) {
            // Process each object.
            async.eachLimit(objects, 5, function(object, callback) {
                // Upload files.
                async.parallel(
                    itemClass.downloadLogic(prefix, object, washer, cache, washer.downloadMedia),
                    function(err, uploads) {
                        if (err) {
                            // Carry on when an upload fails.
                            log.warn(err);
                            callback();
                            return;
                        }
                        items.push(itemClass.factory(object, uploads));
                        callback();
                    });
            }, callback);
        },

        // Delete any old stuff in the cache.
        function(callback) {
            Storage.deleteBefore(cache, moment().subtract(30, 'days').toDate(), callback);
        }
    ], function(err) {
        // Return all the constructed items.
        callback(err, items);
    });
};

// Construct an Item given an API response and any upload info.
Item.factory = function(obj, uploads) {
    return new Item(obj);
};

// Build the S3 object prefix for a media type.
Item.buildPrefix = function(jobName, className) {
    return ('jobs.' + jobName + '.' + className).toLowerCase().split('.').join('/');
};

// Build an HTML video player.
Item.buildVideo = function(videoUrl, thumbUrl, width, height) {
    var s = util.format('<p><video controls width="100%" src="%s" autobuffer="false" preload="none"', videoUrl);
    if (thumbUrl) {
        s += util.format(' poster="%s"', thumbUrl);
    }
    if (width && height) {
        s += util.format(' width="%d" height="%d"', width, height);
    }
    s += '></video></p>';
    return s;
};

// Build an HTML audio player.
Item.buildAudio = function(audioUrl) {
    return util.format('<p><audio controls width="100%" preload="none" src="%s" /></p>', audioUrl);
};

module.exports = Item;