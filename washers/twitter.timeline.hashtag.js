'use strict';

/*
Twitter hashtag washer
input: searches for tweets with a hashtag and converts them into items
output: none
*/
ns('Washers.Twitter.Timeline', global);
Washers.Twitter.Timeline.Hashtag = function(config, job) {
    Washers.Twitter.Timeline.call(this, config, job);

    this.name = 'Twitter/Hashtag';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Load recent tweets with a given hashtag.',
        settings: [{
            name: 'hashtag',
            prompt: 'What hashtag do you want to follow?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                newValue = newValue.replace('#', '');
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Twitter.Timeline.Hashtag.prototype = Object.create(Washers.Twitter.Timeline.prototype);
Washers.Twitter.Timeline.Hashtag.className = Helpers.buildClassName(__filename);

Washers.Twitter.Timeline.Hashtag.prototype.doInput = function(callback) {
    this.requestTweets('search/tweets.json', {
        q: '#' + this.hashtag,
        result_type: 'recent'
    }, callback);
};

module.exports = Washers.Twitter.Timeline.Hashtag;
