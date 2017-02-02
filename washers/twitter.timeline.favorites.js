'use strict';

/*
Twitter favorites washer
input: searches for tweets favorited by the current user
output: none
*/
ns('Washers.Twitter.Timeline', global);
Washers.Twitter.Timeline.Favorites = function(config, job) {
    Washers.Twitter.Timeline.call(this, config, job);

    this.name = 'Twitter/Favorites';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Load tweets recently favorited by the current user.'
    });
};

Washers.Twitter.Timeline.Favorites.prototype = Object.create(Washers.Twitter.Timeline.prototype);
Washers.Twitter.Timeline.Favorites.className = Helpers.buildClassName(__filename);

Washers.Twitter.Timeline.Favorites.prototype.doInput = function(callback) {
    this.requestTweets('favorites/list.json', {}, callback);
};

module.exports = Washers.Twitter.Timeline.Favorites;
