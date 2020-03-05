'use strict';

// Basic class representing an item from anywhere.
var Item = function(config) {
    this.title = ''; // text-only short string
    this.caption = ''; // text-only longer string
    this.description = ''; // formatted longer string
    this.url = '';
    this.date = moment();
    this.author = '';
    this.tags = [];
    this.mediaUrl = ''; // media to include in enclosure
    this.mediaBytes = 0; // size of enclosure
    this.imageUrl = ''; // a single image representing the post

    // The primary key is used in the MySQL (and maybe similar) washers to prevent the insertion of duplicate entries into a table.
    this._primaryKey = 'url';

    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }

    this.className = Helpers.buildClassName(__filename);
};

/*
Defines logic for downloading any files associated with this item.
* prefix: The directory at which the download will end up. Add a filename to this.
* obj: The API response from the washer which represents the item.
* cache: Information about already downloaded files -- just pass on to Storage.downloadUrl.
* download: Whether or not to actually perform the download -- just pass on to Storage.downloadUrl.
*/
Item.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {};
};

// Given a collection of API responses, perform downloads and construct Item objects.
Item.download = function(itemClass, washer, objects, callback) {
    var prefix = Item.buildPrefix(washer.job.name, itemClass.className);
    var items = [];
    var cache = [];

    async.waterfall([
        // Cache existing newKeys so they're not uploaded again.
        function(callback) {
            if (washer.downloadMedia) {
                Storage.cacheFiles(washer.job.log, prefix, function(err, c) {
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
                // Download files.
                async.parallel(
                    itemClass.downloadLogic(prefix, object, washer, cache, washer.downloadMedia),
                    function(err, uploads) {
                        if (err) {
                            // Carry on when an download fails.
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
            Storage.deleteBefore(washer.job.log, cache, moment().subtract(commander.mediaAge, 'days').toDate(), callback);
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
    if (className) {
        return ('jobs.' + jobName + '.' + className).toLowerCase().split('.').join('/');
    } else {
        return ('jobs.' + jobName).toLowerCase().split('.').join('/');
    }
};

// Build an HTML video player.
Item.buildVideo = function(videoUrl, thumbUrl, width, height, autoPlay, loop) {
    var s = util.format('<p><video controls src="%s"', videoUrl);
    if (thumbUrl) {
        s += util.format(' poster="%s"', thumbUrl);
    }
    if (width && height) {
        s += util.format(' width="%d" height="%d"', width, height);
    } else {
        s+= ' width="100%"';
    }
    if (autoPlay) {
        // s += ' autoplay playsinline';
    }
    if (loop) {
        s += ' loop';
    }
    s += ' muted></video></p>';
    return s;
};

// Build an HTML audio player.
Item.buildAudio = function(audioUrl) {
    return util.format('<p><audio controls width="100%" preload="none" src="%s" /></p>', audioUrl);
};

module.exports = Item;
