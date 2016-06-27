'use strict';

/*
Tumblr blog washer
input: converts posts from a particular Tumblr blog into Items
output: none
*/
ns('Washers.Tumblr', global);
Washers.Tumblr.Blog = function(config, job) {
    Washers.Tumblr.call(this, config, job);

    this.name = 'Tumblr/Blog';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from a Tumblr blog.',
        prompts: [{
                name: 'blogHost',
                message: 'Which Tumblr blog do you want to follow? Enter something like "beeple.tumblr.com".'
            },
            Washer.downloadMediaOption
        ]
    });
};

Washers.Tumblr.Blog.prototype = Object.create(Washers.Tumblr.prototype);
Washers.Tumblr.Blog.className = Helpers.buildClassName(__filename);

Washers.Tumblr.Blog.prototype.doInput = function(callback) {
    var quantity = 50;
    var posts = [];
    var lastResponse = null;
    var limit = 20;
    var that = this;
    async.doWhilst(function(callback) {
        // https://www.tumblr.com/docs/en/api/v2
        Helpers.jsonRequest(
            that.job.log,
            extend({
                uri: '/blog/' + that.blogHost + '/posts',
                qs: {
                    limit: Math.min(limit, quantity - posts.length),
                    offset: posts.length
                }
            }, that._requestOptions),
            function(response) {
                response = response.response;
                posts = posts.concat(response.posts);
                lastResponse = response;
                callback();
            },
            callback);
    }, function() {
        return lastResponse.posts.length === limit && posts.length < quantity;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        Item.download(Items.Tumblr.Post, that, posts, callback);
    });
};

module.exports = Washers.Tumblr.Blog;
