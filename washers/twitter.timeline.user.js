'use strict';

/*
Twitter user timeline washer
input: converts media from a user's Twitter timeline into items
output: none
*/
ns('Washers.Twitter.Timeline', global);
Washers.Twitter.Timeline.User = function(config) {
    Washers.Twitter.Timeline.call(this, config);

    this.name = 'Twitter/User';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a Twitter user.',
        settings: [{
            name: 'username',
            prompt: 'What user do you want to follow?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Twitter.Timeline.User.prototype = Object.create(Washers.Twitter.Timeline.prototype);

Washers.Twitter.Timeline.User.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestTweets('statuses/user_timeline', {
        screen_name: this.username
    }, callback);
};

module.exports = Washers.Twitter.Timeline.User;