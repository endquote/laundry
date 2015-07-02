'use strict';

/*
Twitter list washer
input: converts media from a twitter list into items
output: none
*/
ns('Washers.Twitter.Timeline', global);
Washers.Twitter.Timeline.List = function(config) {
    Washers.Twitter.Timeline.call(this, config);

    this.name = 'Twitter/List';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent tweets Twitter list.',
        settings: [{
            name: 'listOwner',
            prompt: 'Who owns the list?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                newValue = newValue.replace('@', '');
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'listName',
            prompt: 'What list do you want to follow?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Twitter.Timeline.List.prototype = Object.create(Washers.Twitter.Timeline.prototype);

Washers.Twitter.Timeline.List.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestTweets('lists/statuses', {
        count: 200,
        owner_screen_name: this.listOwner,
        slug: this.listName,
        include_rts: this.excludeRetweets !== 'y'
    }, callback);
};

module.exports = Washers.Twitter.Timeline.List;