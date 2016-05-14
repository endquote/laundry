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
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent tweets Twitter list.',
        prompts: [{
            name: 'listOwner',
            message: 'Who owns the list?',
            filter: function(value) {
                return value.replace('@', '');
            }
        }, {
            name: 'listName',
            message: 'What list do you want to follow?'
        }]
    });
};

Washers.Twitter.Timeline.List.prototype = Object.create(Washers.Twitter.Timeline.prototype);
Washers.Twitter.Timeline.List.className = Helpers.buildClassName(__filename);

Washers.Twitter.Timeline.List.prototype.doInput = function(callback) {
    this.requestTweets('lists/statuses.json', {
        owner_screen_name: this.listOwner,
        slug: this.listName
    }, callback);
};

module.exports = Washers.Twitter.Timeline.List;
