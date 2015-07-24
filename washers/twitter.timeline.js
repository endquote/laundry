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

    // how many to get per shot... maybe make configurable.
    this._quantity = 500;

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Twitter timeline.',
        settings: [{
            name: 'excludeReplies',
            prompt: 'Do you want to exclude replies? (y/n)',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                newValue = newValue.toLowerCase();
                callback(newValue !== 'y' && newValue !== 'n');
            },
        }, {
            name: 'excludeRetweets',
            prompt: 'Do you want to exclude retweets and quotes? (y/n)',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                newValue = newValue.toLowerCase();
                callback(newValue !== 'y' && newValue !== 'n');
            }
        }]
    });
};

Washers.Twitter.Timeline.prototype = Object.create(Washers.Twitter.prototype);

Washers.Twitter.Timeline.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestTweets('statuses/home_timeline.json', {}, callback);
};

Washers.Twitter.Timeline.prototype.requestTweets = function(method, options, callback) {
    var that = this;
    var posts = [];

    var retrievedTotal = 0;
    var retrievedLast = 0;
    var maxId = null;
    if (!options) {
        options = {};
    }
    options.count = 1000;

    async.doWhilst(function(callback) {
        if (maxId) {
            options.max_id = maxId;
        }

        Helpers.jsonRequest(
            extend({
                uri: method,
                qs: options
            }, that._requestOptions),
            function(response) {
                var tweets = response;
                if (tweets.statuses) {
                    // search API
                    tweets = tweets.statuses;
                }

                retrievedLast = 0;
                if (tweets && tweets.length) {
                    retrievedLast = tweets.length;
                    retrievedTotal += tweets.length;
                    log.debug(util.format('Got %d, total %d/%d', retrievedLast, retrievedTotal, that._quantity));
                    tweets.forEach(function(tweet) {
                        maxId = tweet.id_str;
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
                callback();
            },
            callback);
    }, function() {
        return retrievedTotal < that._quantity || retrievedLast === 0;
    }, function(err) {
        callback(err, posts);
    });
};

module.exports = Washers.Twitter.Timeline;
