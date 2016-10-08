'use strict';

/*
Vimeo CaTagtegory washer
input: converts posts from a tag on Vimeo into Items
output: none
*/
ns('Washers.Vimeo', global);
Washers.Vimeo.Feed.Tag = function(config, job) {
    Washers.Vimeo.Feed.call(this, config, job);

    this.name = 'Vimeo/Tag';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a tag on Vimeo.',
        prompts: [{
            name: 'tagName',
            message: 'What is the name of the tag to follow?'
        }]
    });
};

Washers.Vimeo.Feed.Tag.prototype = Object.create(Washers.Vimeo.Feed.prototype);
Washers.Vimeo.Feed.Tag.className = Helpers.buildClassName(__filename);

Washers.Vimeo.Feed.Tag.prototype.doInput = function(callback) {
    // https://developer.vimeo.com/api/endpoints/tags#/{word}/videos
    this.requestFeed(util.format('/tags/%s/videos', this.tagName), null, callback);
};

module.exports = Washers.Vimeo.Feed.Tag;
