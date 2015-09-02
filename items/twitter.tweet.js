'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes a tweet object
ns('Items.Twitter', global);
Items.Twitter.Tweet = function(config) {
    this.favorites = 0;
    this.isFavorited = false;
    this.isReply = null;
    this.isQuote = null;
    this.retweets = 0;
    this.isRetweet = false;
    this.isRetweeted = false;
    this.coordinates = null;

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Twitter.Tweet.prototype = Object.create(Item.prototype);
Items.Twitter.Tweet.className = Helpers.buildClassName(__filename);

// An object passed to async.parallel() which handles downloading of files.
// prefix: the directory at which the download will end up, use to construct the target
// obj: the API response representing the post
// washer: the parent washer, in case you need properties from it
// cache: already downloaded files, pass to downloadUrl
// download: pass to downloadUrl
Items.Twitter.Tweet.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        media: function(callback) {
            var results = [];
            async.each(obj.entities.media, function(entity, callback) {
                // Figure out the biggest size (probably always 'large')
                var width = 0;
                var size = 'thumb';
                for (var i in entity.sizes) {
                    if (entity.sizes[i].w > width) {
                        width = entity.sizes[i].w;
                        size = i;
                    }
                }

                var source = entity.media_url_https + ':' + size;
                var target = prefix + '/' + obj.id + '.' + entity.media_url_https.split('.').pop();

                Storage.downloadUrl(source, target, cache, false, download, function(err, res) {
                    results.push(res);
                    callback();
                });
            }, function(err) {
                callback(err, results);
            });
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Twitter.Tweet.factory = function(tweet, downloads) {
    var item = new Items.Twitter.Tweet({
        date: moment(new Date(tweet.created_at)),
        author: tweet.user.screen_name,
        favorites: tweet.favorite_count,
        isFavorited: tweet.favorited,
        url: util.format('https://twitter.com/%s/status/%s', tweet.user.screen_name, tweet.id_str),
        tags: tweet.entities.hashtags.map(function(tag) {
            return tag.text;
        }),
        isReply: tweet.in_reply_to_screen_name ? true : false,
        isQuote: tweet.quoted_status_id ? true : false,
        retweets: tweet.retweet_count,
        isRetweet: tweet.retweeted_status ? true : false,
        isRetweeted: tweet.retweeted,
        coordinates: tweet.coordinates ? tweet.coordinates.coordinates : null
    });

    if (tweet.entities.media) {
        tweet.entities.media.forEach(function(media) {
            tweet.text = tweet.text.replace(media.url, '');
        });
    }

    if (tweet.entities.urls) {
        tweet.entities.urls.forEach(function(link) {
            tweet.text = tweet.text.replace(link.url, util.format('<a href="%s">%s</a>', link.expanded_url, link.expanded_url));
        });
    }

    item.title = item.author + ': ' + Helpers.shortenString(tweet.text, 30);

    item.description = '';
    if (downloads.media) {
        downloads.media.forEach(function(download) {
            item.description += util.format('<p><img src="%s"/></p>', download.newUrl);
        });
    }

    var text = util.format('<p>%s</p>', tweet.text);
    text = text.replace(/@([\w]+)/g, '<a href="https://twitter.com/$1">@$1</a>');
    text = text.replace(/#([\w]+)/g, '<a href="https://twitter.com/hashtag/$1">#$1</a>');
    item.description += text;

    if (item.coordinates) {
        item.description += util.format('<p>(<a href="http://maps.apple.com/?ll=%s,%s">location</a>)</p>', item.coordinates[0], item.coordinates[1]);
    }

    return item;
};

module.exports = Items.Twitter.Tweet;
