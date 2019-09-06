'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes a tweet object
ns('Items.Twitter', global);
Items.Twitter.Tweet = function(config) {
    this.favorites = 0;
    this.isFavorited = false;
    this.isReply = false;
    this.isQuote = false;
    this.retweets = 0;
    this.isRetweet = false;
    this.isRetweeted = false;
    this.coordinates = {
        lat: 0,
        lon: 0
    };

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Twitter.Tweet.prototype = Object.create(Item.prototype);
Items.Twitter.Tweet.className = Helpers.buildClassName(__filename);

Items.Twitter.Tweet.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        media: function(callback) {
            var results = [];
            var target = '';
            if (!obj.extended_entities || !obj.extended_entities.media) {
                callback(null, results);
                return;
            }

            // Use the extended_entities field to download good media.
            var targetDate = new Date(obj.created_at);
            async.each(obj.extended_entities.media, function(entity, callback) {

                // Add ".n" to the filename if there are multiple media items.
                var mediaIndex = obj.extended_entities.media.length > 1 ? '.' + obj.extended_entities.media.indexOf(entity) : '';

                // Figure out the biggest size (probably always 'large')
                var width = 0;
                var size = 'thumb';
                for (var i in entity.sizes) {
                    if (entity.sizes[i].w > width) {
                        width = entity.sizes[i].w;
                        size = i;
                    }
                }

                // Download the image.
                var source = entity.media_url_https + ':' + size;
                target = prefix + '/' + obj.id + mediaIndex + '.' + entity.media_url_https.split('.').pop();
                Storage.downloadUrl(washer.job.log, source, target, targetDate, cache, false, download, function(err, res) {
                    results.push(res);

                    // If there's a video, download the video... the image was the poster frame.
                    if (entity.type === 'video' || entity.type === 'animated_gif') {
                        var variant = entity.video_info.variants.filter(function(variant) {
                            return variant.content_type === 'video/mp4';
                        })[0];
                        target = prefix + '/' + obj.id + mediaIndex + '.' + variant.url.split('.').pop();
                        Storage.downloadUrl(washer.job.log, variant.url, target, targetDate, cache, false, download, function(err, video) {
                            video.width = entity.sizes.large ? entity.sizes.large.w : 0;
                            video.height = entity.sizes.large ? entity.sizes.large.h : 0;
                            res.video = video;
                            callback();
                        });
                    } else {
                        callback();
                    }

                });
            }, function(err) {
                callback(err, results);
            });
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Twitter.Tweet.factory = function(tweet, downloads) {

    // Use extended text if it's there
    if (tweet.full_text) {
        tweet.text = tweet.full_text;
    }

    // Use extended entities if it's there
    if (tweet.extended_entities) {
        for (var entityType in tweet.extended_entities) {
            tweet.entities[entityType] = tweet.extended_entities[entityType];
        }
    }

    var item = new Items.Twitter.Tweet({
        title: tweet.user.screen_name + ': ',
        description: '',
        date: moment(new Date(tweet.created_at)), // second accuracy -- milliseconds seem to only be in the streaming API
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
        coordinates: tweet.coordinates ? {
            lat: tweet.coordinates.coordinates[1],
            lon: tweet.coordinates.coordinates[0]
        } : null,
        downloads: downloads
    });

    // Start with media, then tweet text.
    var autoplay = downloads.media.length === 1;
    downloads.media.forEach(function(media) {
        if (media.video && media.video.newUrl !== media.video.oldUrl) {
            item.description += Item.buildVideo(media.video.newUrl, media.newUrl, media.video.width, media.video.height, autoplay, autoplay);
        } else {
            item.description += util.format('<p><img src="%s"/></p>', media.newUrl);
        }
    });

    // Parse all the various entities in tweet text to link to hashtags, users, and urls.
    var parsed = '';
    var mediaTags = [];
    var s = new Helpers.wString(tweet.text);
    var len = s.length;
    for (var i = 0; i < len; i++) {
        var c = s.substr(i, 1);

        // Skip media, it gets added at the end.
        var media = tweet.entities && tweet.entities.media && tweet.entities.media.filter(function(media) {
            return i >= media.indices[0] && i <= media.indices[1];
        })[0];
        if (media) {
            continue;
        }

        var url = tweet.entities.urls && tweet.entities.urls.filter(function(url) {
            return url.indices[0] === i;
        })[0];
        if (url) {
            parsed += util.format('<a href="%s">%s</a>', url.expanded_url, url.display_url);
            i = url.indices[1] - 1;
            continue;
        }

        var mention = tweet.entities.user_mentions && tweet.entities.user_mentions.filter(function(mention) {
            return mention.indices[0] === i;
        })[0];
        if (mention) {
            parsed += util.format('<a href="https://twitter.com/%s">@%s</a>', mention.screen_name, mention.screen_name);
            i = mention.indices[1] - 1;
            continue;
        }

        var hashtag = tweet.entities.hashtags && tweet.entities.hashtags.filter(function(hashtag) {
            return hashtag.indices[0] === i;
        })[0];
        if (hashtag) {
            parsed += util.format('<a href="https://twitter.com/hashtag/%s">#%s</a>', hashtag.text, hashtag.text);
            i = hashtag.indices[1] - 1;
            continue;
        }

        var symbol = tweet.entities.symbols && tweet.entities.symbols.filter(function(symbol) {
            return symbol.indices[0] === i;
        })[0];
        if (symbol) {
            parsed += util.format('<a href="http://finance.yahoo.com/q?s=%s">%s</a>', symbol.text, symbol.text);
            i = symbol.indices[1] - 1;
            continue;
        }

        if (c === '\n') {
            // BUG: If a linebreak is immediately after an emoji it doesn't get seen here for some reason.
            parsed += '<br/>';
        } else {
            parsed += c;
        }
    }

    item.description += util.format('<p>%s</p>', parsed);

    item.title = Helpers.shortenString(tweet.text, 30);

    // Add link to geolocation data.
    if (item.coordinates) {
        item.description += util.format('<p>(<a href="http://maps.apple.com/?ll=%s,%s">location</a>)</p>', item.coordinates.lat, item.coordinates.lon);
    }

    return item;
};

module.exports = Items.Twitter.Tweet;
