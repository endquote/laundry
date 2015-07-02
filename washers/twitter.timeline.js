'use strict';

/*
Twitter Timeline washer
input: converts media from the user's Twitter timeline into items
output: none
*/
ns('Washers.Twitter', global);
Washers.Twitter.Timeline = function(config) {
    Washers.Twitter.call(this, config);

    this.name = 'Twitter/Timeline';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Twitter timeline.',
        settings: [{
            name: 'excludeReplies',
            prompt: 'Do you want to exclude replies? (y/n)',
            afterEntry: function(rl, oldValue, newValue, callback) {
                newValue = newValue.toLowerCase();
                callback(newValue !== 'y' && newValue !== 'n');
            },
        }, {
            name: 'excludeRetweets',
            prompt: 'Do you want to exclude retweets and quotes? (y/n)',
            afterEntry: function(rl, oldValue, newValue, callback) {
                newValue = newValue.toLowerCase();
                callback(newValue !== 'y' && newValue !== 'n');
            }
        }]
    });
};

Washers.Twitter.Timeline.prototype = Object.create(Washers.Twitter.prototype);

Washers.Twitter.Timeline.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestTweets('statuses/home_timeline', {
        count: 200,
        exclude_replies: this.excludeReplies === 'y'
    }, callback);
};

Washers.Twitter.Timeline.prototype.requestTweets = function(api, options, callback) {
    var that = this;
    var posts = [];

    this._client.get(api, options, function(err, tweets, response) {
        if (tweets.statuses) {
            // search API
            tweets = tweets.statuses;
        }

        if (tweets && tweets.length) {
            tweets.forEach(function(tweet) {
                var item = Items.Twitter.Tweet.factory(tweet);
                var include = true;
                if (that.excludeReplies === 'y' && item.isReply) {
                    include = false;
                }
                if (that.excludeRetweets === 'y' && (item.isRetweet || item.isQuote)) {
                    include = false;
                }
                if (include) {
                    posts.push(item);
                }
            });
        }
        callback(err, posts);
    });
};

module.exports = Washers.Twitter.Timeline;