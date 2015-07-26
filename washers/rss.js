'use strict';

var FeedParser = require('feedparser'); // https://www.npmjs.com/package/feedparser
var RSSWriter = require('rss'); // https://www.npmjs.com/package/rss
var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename

/*
RSS washer
input: converts an RSS/Atom/RDF file on the internet into Items
output: writes an array of Items to an RSS feed on disk
*/

ns('Washers', global);
Washers.RSS = function(config) {
    Washer.call(this, config);

    this.name = 'RSS';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge({
        description: 'Loads data from an RSS feed.',
        settings: [{
            name: 'url',
            prompt: 'What RSS feed URL do you want to launder?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(!validator.isURL(newValue));
            }
        }]
    }, this.input);

    this.output = _.merge({
        description: 'Writes data to an RSS feed on disk.',
        settings: [{
            name: 'file',
            prompt: 'Where do you want to save the output?',
            beforeEntry: function(rl, job, prompt, callback) {
                var home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
                callback(true, prompt, path.join(home, job.name + '.xml'));
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                Helpers.validateFile(newValue, function(isValid) {
                    callback(!isValid);
                });
            }
        }, {
            name: 'feedname',
            prompt: 'What do you want the title of the output feed to be?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, job.name);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'downloadPath',
            prompt: 'To download media files, enter the path to download to, or leave empty to not download.\n',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, path.join(path.dirname(this.file), sanitize(this.feedname)));
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                if (validator.isWhitespace(newValue)) {
                    callback(false);
                } else {
                    Helpers.validateDirectory(newValue, function(isValid) {
                        callback(!isValid);
                    });
                }
            }
        }, {
            name: 'mediaBase',
            prompt: 'Enter the URL for the media download folder, or just press enter.\n',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(this.downloadPath, prompt);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(!validator.isURL(newValue) && !validator.isWhitespace(newValue));
            }
        }]
    }, this.output);
};

Washers.RSS.prototype = Object.create(Washer.prototype);

// Request the feed, parse it into items, and pass it to the output washer.
Washers.RSS.prototype.doInput = function(callback) {
    var req = request(this.url);
    var feedparser = new FeedParser();
    var items = [];
    var called = false;

    req.on('error', function(err) {
        if (!called) {
            called = true;
            callback(err);
        }
    });

    req.on('response', function(res) {
        var stream = this;
        if (res.statusCode !== 200) {
            callback(new Error('Bad URL?'));
        }

        stream.pipe(feedparser);
    });

    feedparser.on('error', function(err) {
        if (!called) {
            called = true;
            callback(err);
        }
    });

    feedparser.on('readable', function() {
        var stream = this;
        var meta = this.meta;
        var item;

        while (item = stream.read()) { // jshint ignore:line
            items.push(Items.RSS.factory(item));
        }
    });

    feedparser.on('end', function(err) {
        if (!called) {
            called = true;
            callback(err, items);
        }
    });
};

// Format items as an RSS feed and write them to disk.
Washers.RSS.prototype.doOutput = function(items, callback) {
    var that = this;

    var feed = new RSSWriter({
        title: this.feedname,
        description: this.feedname,
        feed_url: 'http://laundry.endquote.com',
        site_url: 'http://laundry.endquote.com',
        generator: 'Laundry'
    });

    async.eachLimit(items, 10, function(item, callback) {

        // Create the basic item
        var feedItem = {
            title: item.title,
            description: item.description,
            url: item.url,
            date: item.date.toDate(),
            author: item.author,
            categories: _.isArray(item.tags) ? item.tags : [item.tags],
            enclosure: item.mediaFile
        };

        // Nothing to download, don't mess with it
        if (!that.downloadPath || !item.mediaFile) {
            feed.item(feedItem);
            callback();
            return;
        }

        // Create the filename and alter the enclosure
        var fileName = encodeURIComponent(item.url);
        fileName += '.' + Helpers.mimeTypeToExtension(item.mediaFile.type);
        var target = path.join(that.downloadPath, fileName);

        // Modify the enclosure
        feedItem.enclosure = {
            url: that.mediaBase ? that.mediaBase + fileName : fileName,
            file: target,
        };

        fs.exists(target, function(exists) {
            if (exists) {
                // File is already loaded
                feed.item(feedItem);
                callback();
            } else {
                // Download the file
                log.debug('Downloading media from ' + feedItem.url);
                request
                    .get(item.mediaFile.url)
                    .on('error', function(err) {
                        callback(err);
                    })
                    .on('end', function() {
                        feed.item(feedItem);
                        callback();
                    })
                    .pipe(fs.createWriteStream(target));
            }
        });
    }, function(err) {
        // Downloads are all done.
        if (err) {
            callback(err);
            return;
        }

        // Build the feed XML.
        var xml = feed.xml({
            indent: true
        });

        // Get the URLs in the existing feed
        var lastUrls = [];
        that._lastItems(function(lastItems) {
            lastItems.forEach(function(lastItem) {
                lastUrls.push(lastItem.url);
            });

            // Remove any from the list which are still in the feed
            items.forEach(function(item) {
                lastUrls.splice(lastUrls.indexOf(item.url), 1);
            });

            // Delete any orphaned media files from old items.
            lastItems.forEach(function(lastItem) {
                var fileName = encodeURIComponent(lastItem.url);
                fileName += '.' + Helpers.mimeTypeToExtension(lastItem.mediaFile.type);
                var target = path.join(that.downloadPath, fileName);
                fs.unlinkSync(target);
                log.debug('Deleting orphaned media from ' + lastItem.url);
            });

            // Write the feed to disk.
            fs.writeFile(that.file, xml, function(err) {
                callback(err);
            });
        });

    });
};

Washers.RSS.prototype._lastItems = function(callback) {
    var items = [];
    var feed = this.file;
    if (!fs.existsSync(feed)) {
        callback(items);
        return;
    }

    fs.createReadStream(feed)
        .on('error', function(error) {
            log.error(error);
        })
        .pipe(new FeedParser())
        .on('error', function(error) {
            log.error(error);
        })
        .on('readable', function() {
            var stream = this;
            var item;
            while (item = stream.read()) { // jshint ignore:line
                var rssItem = Items.RSS.factory(item);
                rssItem.mediaFile = item.enclosures[0];
                items.push(rssItem);
            }
        })
        .on('end', function(err) {
            callback(items);
        });
};

module.exports = Washers.RSS;
