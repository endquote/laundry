'use strict';

/*
Vimeo User washer
input: converts posts from a user on Vimeo into Items
output: none
*/
ns('Washers.Vimeo', global);
Washers.Vimeo.Feed.User = function(config, job) {
    Washers.Vimeo.Feed.call(this, config, job);

    this.name = 'Vimeo/User';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a user on Vimeo.',
        prompts: [{
            name: 'userId',
            message: 'What is the numeric user id to follow?',
            validate: function(value, answers) {
                return value && validator.isInt(value.toString());
            }
        }]
    });
};

Washers.Vimeo.Feed.User.prototype = Object.create(Washers.Vimeo.Feed.prototype);
Washers.Vimeo.Feed.User.className = Helpers.buildClassName(__filename);

Washers.Vimeo.Feed.User.prototype.doInput = function(callback) {
    // https://developer.vimeo.com/api/endpoints/users#/{user_id}/videos
    this.requestFeed(util.format('/users/%d/videos', this.userId), null, callback);
};

module.exports = Washers.Vimeo.Feed.User;
