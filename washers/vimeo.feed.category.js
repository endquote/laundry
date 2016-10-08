'use strict';

/*
Vimeo Category washer
input: converts posts from a category on Vimeo into Items
output: none
*/
ns('Washers.Vimeo', global);
Washers.Vimeo.Feed.Category = function(config, job) {
    Washers.Vimeo.Feed.call(this, config, job);

    this.name = 'Vimeo/Category';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a category on Vimeo.',
        prompts: [{
            name: 'categoryName',
            message: 'What is the name of the category to follow?'
        }]
    });
};

Washers.Vimeo.Feed.Category.prototype = Object.create(Washers.Vimeo.Feed.prototype);
Washers.Vimeo.Feed.Category.className = Helpers.buildClassName(__filename);

Washers.Vimeo.Feed.Category.prototype.doInput = function(callback) {
    // https://developer.vimeo.com/api/endpoints/categories#/%7Bcategory%7D/videos
    this.requestFeed(util.format('/categories/%s/videos', this.categoryName), null, callback);
};

module.exports = Washers.Vimeo.Feed.Category;
