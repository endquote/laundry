'use strict';

/*
Twitter list washer
input: converts media from a twitter list into items
output: none
*/
ns('Washers.Twitter.Timeline', global);
Washers.Twitter.Timeline.List = function(config, job) {
    Washers.Twitter.Timeline.call(this, config, job);

    this.name = 'Twitter/List';

    this.input = _.merge(this.input, {
        description: 'Loads recent tweets Twitter list.',
        settings: [{
            name: 'listOwner',
            prompt: 'Who owns the list?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                newValue = newValue.replace('@', '');
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'listName',
            prompt: 'What list do you want to follow?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Twitter.Timeline.List.prototype = Object.create(Washers.Twitter.Timeline.prototype);

Washers.Twitter.Timeline.List.prototype.doInput = function(callback) {
    this.requestTweets('lists/statuses.json', {
        owner_screen_name: this.listOwner,
        slug: this.listName
    }, callback);
};

module.exports = Washers.Twitter.Timeline.List;
