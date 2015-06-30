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

    Item.call(this, config);
};

Items.Twitter.Tweet.prototype = Object.create(Item.prototype);

Items.Twitter.Tweet.factory = function(tweet) {
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
        isRetweeted: tweet.retweeted
    });

    item.title = item.author + ': ' + Helpers.shortenString(tweet.text, 30);

    if (tweet.entities.media) {
        tweet.entities.media.forEach(function(media) {
            tweet.text = tweet.text.slice(media.indices[0], media.indices[1]);
        });
    }

    item.description = util.format('<p>%s</p>', tweet.text);
    item.description = item.description.replace(/@([\w]+)/g, '<a href="https://twitter.com/$1">@$1</a>');
    item.description = item.description.replace(/#([\w]+)/g, '<a href="https://twitter.com/hashtag/$1">#$1</a>');
    item.description = Autolinker.link(item.description);

    if (tweet.entities.media) {
        tweet.entities.media.forEach(function(media) {
            item.description += util.format('<p><img src="%s:large"/></p>', media.media_url);
        });
    }

    return item;
};

module.exports = Items.Twitter.Tweet;