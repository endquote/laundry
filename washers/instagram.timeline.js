'use strict';

/*
Instagram Timeline washer
input: converts media from the user's Instagram timeline into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Timeline = function(config, job) {
    Washers.Instagram.call(this, config, job);

    this.name = 'Instagram/Timeline';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from your Instagram timeline.',
        prompts: [Washer.downloadMediaOption]
    });
};

Washers.Instagram.Timeline.prototype = Object.create(Washers.Instagram.prototype);
Washers.Instagram.Timeline.className = Helpers.buildClassName(__filename);

Washers.Instagram.Timeline.prototype.doInput = function(callback) {
    var that = this;
    var following = [];
    var posts = [];

    // Log in.
    this.login(function(e) {
        // Get the list of user's we're following, it's a paged list.
        var next_max_id;
        async.doWhilst(function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    jar: that._jar,
                    url: 'friendships/following',
                    qs: {
                        ig_sig_key_version: that._igKeyVersion,
                        rank_token: that._igRankToken,
                        max_id: next_max_id
                    }
                }, that._requestOptions),
                function(response) {
                    next_max_id = response.next_max_id;
                    following = following.concat(response.users);
                    callback();
                },
                callback
            );
        }, function() {
            return next_max_id;
        }, function(err) {
            if (err) {
                callback(err);
                return;
            }

            // Get the last page of photos from each user.
            // It seems to consistently return 18 posts, could make requests for additional pages.
            async.eachLimit(following, 5, function(user, callback) {
                Helpers.jsonRequest(
                    that.job.log,
                    extend({
                        jar: that._jar,
                        url: 'feed/user/' + user.pk + '/'
                    }, that._requestOptions),
                    function(response) {
                        posts = posts.concat(response.items);
                        callback();
                    }
                );
            }, function(err) {
                that.job.log.debug('Got %d posts', posts.length);

                // Throw out all but the latest posts.
                posts.sort(function(a, b) {
                    return b.taken_at - a.taken_at;
                });
                posts = posts.slice(0, 150);

                // Trigger item creation, download, and processing.
                Item.download(Items.Instagram.Media, that, posts, callback);
            });
        });
    });
};

Washers.Instagram.Timeline.prototype.requestMedia = function(method, callback) {
    var that = this;

    var quantity = 150;
    var posts = [];
    var nextMax = null;
    async.doWhilst(function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: method,
                    qs: {
                        count: quantity - posts.length,
                        max_id: nextMax ? nextMax : ''
                    }
                }, that._requestOptions),
                function(response) {
                    response.data.forEach(function(media) {
                        posts.push(media);
                    });
                    that.job.log.debug(util.format('Got %d/%d posts', posts.length, quantity));
                    nextMax = response.pagination.next_max_id;
                    callback();
                },
                callback);
        },
        function() {
            return posts.length < quantity && nextMax;
        },
        function(err) {
            if (err) {
                callback(err);
                return;
            }

            Item.download(Items.Instagram.Media, that, posts, callback);
        });
};

module.exports = Washers.Instagram.Timeline;
