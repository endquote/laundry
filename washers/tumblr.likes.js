'use strict';

/*
Tumblr likes washer
input: converts liked posts by the Tumblr user into Items
output: none
*/
ns('Washers.Tumblr', global);
Washers.Tumblr.Likes = function(config, job) {
    Washers.Tumblr.call(this, config, job);

    this.name = 'Tumblr/Likes';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads posts you\'ve liked on Tumblr.',
        prompts: [
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 50)
        ]
    });
};

Washers.Tumblr.Likes.prototype = Object.create(Washers.Tumblr.prototype);
Washers.Tumblr.Likes.className = Helpers.buildClassName(__filename);

Washers.Tumblr.Likes.prototype.doInput = function(callback) {
    var posts = [];
    var lastResponse = null;
    var limit = 20;
    var that = this;
    async.doWhilst(function(callback) {
        // https://www.tumblr.com/docs/en/api/v2
        Helpers.jsonRequest(
            that.job.log,
            extend({
                uri: '/user/likes',
                qs: {
                    limit: Math.min(limit, that.quantity - posts.length),
                    offset: posts.length
                }
            }, that._requestOptions),
            function(response) {
                response = response.response;
                posts = posts.concat(response.liked_posts);
                that.job.log.debug(util.format('Got %d/%d posts', posts.length, that.quantity));
                lastResponse = response;
                callback();
            },
            callback);
    }, function() {
        return lastResponse.liked_posts.length === limit && posts.length < that.quantity;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        Item.download(Items.Tumblr.Post, that, posts, callback);
    });
};

module.exports = Washers.Tumblr.Likes;
