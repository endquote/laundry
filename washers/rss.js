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
        }]
    }, this.output);
};

Washers.RSS.prototype = Object.create(Washer.prototype);

// Request the feed, parse it into items, and pass it to the output washer.
Washers.RSS.prototype.doInput = function(callback) {
    this.beforeInput();
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
    this.beforeOutput();
    var feed = new RSSWriter({
        title: this.feedname,
        description: this.feedname,
        feed_url: 'http://laundry.endquote.com',
        site_url: 'http://laundry.endquote.com',
        generator: 'Laundry'
    });

    if (items) {
        items.forEach(function(item) {
            feed.item({
                title: item.title,
                description: item.description,
                url: item.url,
                date: item.date.toDate(),
                author: item.author,
                categories: item.tags
            });
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