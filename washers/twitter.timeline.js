'use strict';

/*
Twitter Timeline washer
input: converts media from the user's Twitter timeline into items
output: none
*/
ns('Washers.Twitter', global);
Washers.Twitter.Timeline = function(config, job) {
    Washers.Twitter.call(this, config, job);

    this.name = 'Twitter/Timeline';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Twitter timeline.',
        prompts: [{
                type: 'confirm',
                name: 'excludeReplies',
                default: false,
                message: 'Do you want to exclude replies?'
            }, {
                type: 'confirm',
                name: 'excludeRetweets',
                default: false,
                message: 'Do you want to exclude retweets and quotes?'
            },
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 500)
        ]
    });
};

Washers.Twitter.Timeline.prototype = Object.create(Washers.Twitter.prototype);
Washers.Twitter.Timeline.className = Helpers.buildClassName(__filename);

Washers.Twitter.Timeline.prototype.doInput = function(callback) {
    this.requestTweets('statuses/home_timeline.json', {}, callback);
};

Washers.Twitter.Timeline.prototype.requestTweets = function(method, options, callback) {
    var that = this;
    var posts = [];

    var retrievedTotal = 0;
    var retrievedLast = 0;
    var maxId = null;
    options = options || {};
    options.count = 1000;
    options.tweet_mode = 'extended';

    async.doWhilst(function(callback) {
        if (maxId) {
            options.max_id = maxId;
        }

        Helpers.jsonRequest(
            that.job.log,
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
                    that.job.log.debug(util.format('Got %d, total %d/%d', retrievedLast, retrievedTotal, that.quantity));
                    tweets.forEach(function(tweet) {
                        maxId = tweet.id_str;
                        var include = true;
                        if (that.excludeReplies && tweet.in_reply_to_screen_name && tweet.in_reply_to_screen_name !== tweet.user.screen_name) {
                            include = false;
                        }
                        if (that.excludeRetweets && (tweet.retweeted_status || tweet.quoted_status_id)) {
                            include = false;
                        }
                        if (include) {
                            posts.push(tweet);
                        }
                    });
                }
                callback();
            },
            callback);
    }, function() {
        return retrievedTotal < that.quantity && retrievedLast > 1;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        posts = posts.slice(0, that.quantity);
        Item.download(Items.Twitter.Tweet, that, posts, callback);
    });
};

module.exports = Washers.Twitter.Timeline;
