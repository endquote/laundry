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
        description: 'Loads recent posts from your Twitter timeline.'
    });
};

Washers.Twitter.Timeline.prototype = Object.create(Washers.Twitter.prototype);

Washers.Twitter.Timeline.prototype.doInput = function(callback) {
    this.beforeInput();

    var posts = [];

    this.client.get('statuses/home_timeline', {
        count: 200
    }, function(err, tweets, response) {
        tweets.forEach(function(tweet) {
            var item = Items.Twitter.Tweet.factory(tweet);
            if (!item.isReply && !item.isQuote && !item.isRetweet) {
                posts.push(item);
            }
        });
        callback(err, posts);
    });
};

module.exports = Washers.Twitter.Timeline;