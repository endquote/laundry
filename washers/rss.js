var fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
var Backbone = require('Backbone'); // http://backbonejs.org/
var _ = require('lodash'); // https://lodash.com/docs
var request = require('request'); // https://www.npmjs.com/package/request
var moment = require('moment'); // http://momentjs.com/docs/

var FeedParser = require('feedparser'); // https://www.npmjs.com/package/feedparser
var RSS = require('rss'); // https://www.npmjs.com/package/rss

var Washer = require('../washer');
var Item = require('../item');

rss = Washer.extend({
    defaults: {
        name: 'rss'
    },

    input: {
        description: 'Loads data from an RSS feed.',
        settings: [{
            name: 'url',
            type: 'url',
            prompt: 'What RSS feed URL do you want to launder?'
        }]
    },

    output: {
        description: 'Writes data to an RSS feed on disk.',
        settings: [{
            name: 'file',
            type: 'file',
            prompt: 'Where do you want to save the output?'
        }, {
            name: 'feedname',
            type: 'string',
            prompt: 'What do you want the title of the output feed to be?'
        }]
    },

    // Request the feed, parse it into items, and pass it to the output washer.
    doInput: function(callback) {
        var req = request(this.get('url'));
        var feedparser = new FeedParser();
        var items = [];

        req.on('error', function(err) {
            callback(err);
        });

        req.on('response', function(res) {
            var stream = this;
            if (res.statusCode != 200) {
                callback(new Error('Bad status code'));
            }

            stream.pipe(feedparser);
        });

        feedparser.on('error', function(err) {
            callback(err);
        });

        feedparser.on('readable', function() {
            var stream = this;
            var meta = this.meta;
            var item;

            while (item = stream.read()) {
                items.push(new Item({
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
            callback(err, items);
        });
    },

    // Format items as an RSS feed and write them to disk.
    doOutput: function(items, callback) {
        var feed = new RSS({
            title: this.get('feedname'),
            description: this.get('feedname'),
            feed_url: 'http://github.com/endquote/laundry',
            site_url: 'http://github.com/endquote/laundry',
            generator: 'Laundry'
        });

        items.forEach(function(item) {
            feed.item({
                title: item.get('title'),
                description: item.get('description'),
                url: item.get('url'),
                date: item.get('date').toDate(),
                author: item.get('author'),
                categories: item.get('tags')
            });
        });

        var xml = feed.xml({
            indent: true
        });

        fs.writeFile(this.get('file'), xml, function(err) {
            callback(err);
        })
    }
});

_.merge(Washer.prototype.defaults, rss.prototype.defaults);
module.exports = rss;