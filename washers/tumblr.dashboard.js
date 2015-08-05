'use strict';

/*
Tumblr Dashboard washer
input: converts media from the user's Tumblr Dashboard into items
output: none
*/
ns('Washers.Tumblr', global);
Washers.Tumblr.Dashboard = function(config, job) {
    Washers.Tumblr.call(this, config, job);

    this.name = 'Tumblr/Dashboard';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Tumblr Dashboard.'
    });
};

Washers.Tumblr.Dashboard.prototype = Object.create(Washers.Tumblr.prototype);
Washers.Tumblr.Dashboard.className = Helpers.buildClassName(__filename);

Washers.Tumblr.Dashboard.prototype.doInput = function(callback) {
    var quantity = 100;
    var posts = [];
    var lastResponse = null;
    var limit = 20;
    var that = this;
    async.doWhilst(function(callback) {
        // https://www.tumblr.com/docs/en/api/v2
        Helpers.jsonRequest(
            extend({
                uri: '/user/dashboard',
                qs: {
                    limit: Math.min(limit, quantity - posts.length),
                    since_id: posts.length ? posts[posts.length - 1].id : null
                }
            }, that._requestOptions),
            function(response) {
                response = response.response;
                posts = posts.concat(response.posts);
                log.debug(util.format('Got %d/%d posts', posts.length, quantity));
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

module.exports = Washers.Tumblr.Dashboard;
