'use strict';

/*
Vimeo Feed washer
input: converts posts from the user's Vimeo Feed into Items
output: none
*/
ns('Washers.Vimeo', global);
Washers.Vimeo.Feed = function(config, job) {
    Washers.Vimeo.call(this, config, job);

    this.name = 'Vimeo/Feed';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Vimeo Feed.',
        prompts: [
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 20)
        ]
    });
};

Washers.Vimeo.Feed.prototype = Object.create(Washers.Vimeo.prototype);
Washers.Vimeo.Feed.className = Helpers.buildClassName(__filename);

Washers.Vimeo.Feed.prototype.doInput = function(callback) {
    // https://developer.vimeo.com/api/endpoints/me#/feed
    this.requestFeed('/me/feed', null, callback);
};

Washers.Vimeo.Feed.prototype.requestFeed = function(method, options, callback) {
    var posts = [];

    var lastResponse = null;
    var page = 1;
    var limit = 20;
    var that = this;

    options = options || {};
    options.page = page;
    options.per_page = 50;
    options.filter = options.filter || 'playable';
    options.filter_playable = options.filter_playable || true;

    async.doWhilst(function(callback) {
        Helpers.jsonRequest(
            that.job.log,
            extend({
                uri: method,
                qs: options
            }, that._requestOptions),
            function(response) {
                posts = posts.concat(response.data);
                that.job.log.debug(util.format('Got %d/%d posts', posts.length, that.quantity));
                lastResponse = response;
                callback();
            },
            callback);
    }, function() {
        return lastResponse.data.length === limit && posts.length < that.quantity;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        // We only care about the clip
        posts = posts.map(function(p) {
            return p.clip || p;
        });

        Item.download(Items.Vimeo.Video, that, posts, callback);
    });
};

module.exports = Washers.Vimeo.Feed;
