'use strict';

/*
Vimeo Group washer
input: converts posts from a group on Vimeo into Items
output: none
*/
ns('Washers.Vimeo', global);
Washers.Vimeo.Feed.Group = function(config, job) {
    Washers.Vimeo.Feed.call(this, config, job);

    this.name = 'Vimeo/Group';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a group on Vimeo.',
        prompts: [{
            name: 'groupId',
            message: 'What is the id of the group to follow?'
        }]
    });
};

Washers.Vimeo.Feed.Group.prototype = Object.create(Washers.Vimeo.Feed.prototype);
Washers.Vimeo.Feed.Group.className = Helpers.buildClassName(__filename);

Washers.Vimeo.Feed.Group.prototype.doInput = function(callback) {
    // https://developer.vimeo.com/api/endpoints/groups#/%7Bgroup_id%7D/videos
    this.requestFeed(util.format('/groups/%s/videos', this.groupId), null, callback);
};

module.exports = Washers.Vimeo.Feed.Group;
