'use strict';

var FeedParser = require('feedparser'); // https://www.npmjs.com/package/feedparser
var RSSWriter = require('rss'); // https://www.npmjs.com/package/rss

/*
RSS washer
input: converts an RSS/Atom/RDF file on the internet into Items
output: writes an array of Items to an RSS feed on disk
*/

ns('Washers', global);
Washers.RSS = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'RSS';
    this.className = Helpers.buildClassName(__filename);

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
        }]
    }, this.output);
};

Washers.RSS.prototype = Object.create(Washer.prototype);
Washers.RSS.className = Helpers.buildClassName(__filename);

// Request the feed, parse it into items, and pass it to the output washer.
Washers.RSS.prototype.doInput = function(callback) {
    var req = request(this.url);
    var feedparser = new FeedParser();
    var items = [];
    var called = false;
    var that = this;

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
            items.push(item);
        }
    });

    feedparser.on('end', function(err) {
        if (!called) {
            called = true;
            Item.download(Items.RSS, that, items, callback);
        }
    });
};

// Format items as an RSS feed and write them to disk.
Washers.RSS.prototype.doOutput = function(items, callback) {
    var feedSettings = {
        title: this.feedname,
        description: this.feedname,
        feed_url: 'http://laundry.endquote.com',
        site_url: 'http://laundry.endquote.com',
        generator: 'Laundry'
    };

    // If there are any enclosures, add some custom iTunes podcast stuff.
    if (items.filter(function(item) {
        return item.mediaUrl;
    }).length) {
        feedSettings.custom_namespaces = {
            'itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd'
        };
        feedSettings.custom_elements = [{
            'itunes:image': {
                _attr: {
                    href: 'http://laundry.endquote.com/favicons/apple-touch-icon.png'
                }
            }
        }];
    }

    var feed = new RSSWriter(feedSettings);

    if (items) {
        items.forEach(function(item) {
            var entry = {
                title: item.title,
                description: item.description,
                url: item.url,
                date: item.date.toDate(),
                author: item.author,
                categories: _.isArray(item.tags) ? item.tags : [item.tags]
            };

            // Set up enclosures.
            if (item.mediaUrl) {
                entry.enclosure = {
                    url: item.mediaUrl
                };

                entry.custom_elements = [{
                    'itunes:author': item.author,
                }, {
                    'itunes:duration': item.duration
                }, {
                    'itunes:image': {
                        _attr: {
                            href: item.artwork || item.thumbnail
                        }
                    }
                }];
            }

            feed.item(entry);
        });
    }

    var xml = feed.xml({
        indent: true
    });

    fs.writeFile(this.file, xml, function(err) {
        callback(err);
    });
};

module.exports = Washers.RSS;
