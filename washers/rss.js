'use strict';

var request = require('request'); // https://www.npmjs.com/package/request
var FeedParser = require('feedparser'); // https://www.npmjs.com/package/feedparser
var RSSWriter = require('rss'); // https://www.npmjs.com/package/rss

/*
RSS washer
input: converts an RSS/Atom/RDF file on the internet into Items
output: writes an array of Items to an RSS feed on disk
*/

ns('Washers', global);
Washers.RSS = function(config) {
    Washer.call(this, config);

    this.name = 'RSS';
    this.classFile = path.basename(__filename);

    this.input = {
        description: 'Loads data from an RSS feed.',
        settings: [{
            name: 'url',
            prompt: 'What RSS feed URL do you want to launder?',
            afterEntry: function(oldValue, newValue, callback) {
                callback(!Washer.validateString(newValue));
            }
        }]
    };

    this.output = {
        description: 'Writes data to an RSS feed on disk.',
        settings: [{
            name: 'file',
            prompt: 'Where do you want to save the output?',
            afterEntry: function(oldValue, newValue, callback) {
                callback(!Washer.validateString(newValue));
            }
        }, {
            name: 'feedname',
            prompt: 'What do you want the title of the output feed to be?',
            afterEntry: function(oldValue, newValue, callback) {
                callback(!Washer.validateString(newValue));
            }
        }]
    };
};

Washers.RSS.prototype = _.create(Washer.prototype, {
    constructor: Washers.RSS
});

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
            items.push(new Items.RSS({
                title: item.title,
                description: item.description,
                url: item.link,
                date: moment(item.date),
                author: item.author,
                tags: item.categories
            }));
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
    var feed = new RSSWriter({
        title: this.feedname,
        description: this.feedname,
        feed_url: 'http://github.com/endquote/laundry',
        site_url: 'http://github.com/endquote/laundry',
        generator: 'Laundry'
    });

    if (items) {
        items.forEach(function(item) {
            if (item instanceof Items.Google.YouTube.Video) {
                feed.item({
                    title: item.title,
                    description: item.description,
                    url: item.url,
                    date: item.date.toDate(),
                    author: item.author,
                });
            } else if (item instanceof Items.RSS) {
                feed.item({
                    title: item.title,
                    description: item.description,
                    url: item.url,
                    date: item.date.toDate(),
                    author: item.author,
                    categories: item.tags
                });
            }
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