'use strict';

var tumblr = require('tumblr.js');

/*
Tumblr Dashboard washer
input: converts media from the user's Tumblr Dashboard into items
output: none
*/
ns('Washers.Tumblr', global);
Washers.Tumblr.Dashboard = function(config) {
    Washers.Tumblr.call(this, config);

    this.name = 'Tumblr/Dashboard';
    this.classFile = path.basename(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Tumblr Dashboard.'
    });
};

Washers.Tumblr.Dashboard.prototype = _.create(Washers.Tumblr.prototype);

Washers.Tumblr.Dashboard.prototype.doInput = function(callback) {
    var client = tumblr.createClient({
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret,
        token: this.accessToken,
        token_secret: this.accessTokenSecret
    });

    var quantity = 160;
    var posts = [];
    var lastResponse = null;
    var limit = 20;
    async.doWhilst(function(callback) {
        client.dashboard({
            limit: Math.min(limit, quantity - posts.length)
        }, function(err, data) {
            if (err) {
                callback(err);
                return;
            }

            posts = posts.concat(data.posts);
            log.debug(util.format('Got %d/%d posts', posts.length, quantity));
            lastResponse = data;
            callback();
        });
    }, function() {
        return lastResponse.posts.length === limit && posts.length <= quantity;
    }, function(err) {
        callback(err, posts);
    });
};

module.exports = Washers.Tumblr.Dashboard;