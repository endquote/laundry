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

    // Flag to set this as the default washer choice.
    this._isDefaultWasher = true;

    this.input = _.merge({
        description: 'Loads data from an RSS feed.',
        prompts: [{
            name: 'url',
            message: 'What RSS feed URL do you want to launder?',
            validate: function(value) {
                return validator.isURL(value);
            }
        }]
    }, this.input);

    this.output = _.merge({
        description: 'Writes data to an RSS feed on disk.',
        prompts: [{
            name: 'feedname',
            message: 'What do you want the title of the output feed to be?',
            setup: function(job) {
                this.default = job.name;
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
        feed_url: 'http://github.com/endquote/laundry',
        site_url: 'http://github.com/endquote/laundry',
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
                    href: 'https://endquote.github.io/laundry/icons/apple-touch-icon.png'
                }
            }
        }];
    }

    var feed = new RSSWriter(feedSettings);

    if (items) {
        items.sort(function(a, b) {
            return b.date.toDate().getTime() - a.date.toDate().getTime();
        });

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
                    url: item.mediaUrl,
                    size: item.mediaBytes
                };

                entry.custom_elements = [{
                    'itunes:author': item.author,
                }, {
                    'itunes:duration': item.duration
                }, {
                    'itunes:image': {
                        _attr: {
                            href: item.artwork || item.thumbnail || item.imageUrl
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

    var target = Item.buildPrefix(this.job.name, this.className) + '/feed.xml';
    var that = this;
    Storage.writeFile(target, xml, function(err, destination) {
        if (destination) {
            that.job.log.info('The feed is available at ' + destination);
        }
        callback(err);
    });
};

module.exports = Washers.RSS;
