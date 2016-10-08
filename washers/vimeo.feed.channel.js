'use strict';

/*
Vimeo Channel washer
input: converts posts from a channel on Vimeo into Items
output: none
*/
ns('Washers.Vimeo', global);
Washers.Vimeo.Feed.Channel = function(config, job) {
    Washers.Vimeo.Feed.call(this, config, job);

    this.name = 'Vimeo/Channel';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a channel on Vimeo.',
        prompts: [{
            name: 'channelId',
            message: 'What is the id of the channel to follow?'
        }]
    });
};

Washers.Vimeo.Feed.Channel.prototype = Object.create(Washers.Vimeo.Feed.prototype);
Washers.Vimeo.Feed.Channel.className = Helpers.buildClassName(__filename);

Washers.Vimeo.Feed.Channel.prototype.doInput = function(callback) {
    // https://developer.vimeo.com/api/endpoints/channels#/%7Bchannel_id%7D/videos
    this.requestFeed(util.format('/channels/%s/videos', this.channelId), null, callback);
};

module.exports = Washers.Vimeo.Feed.Channel;
