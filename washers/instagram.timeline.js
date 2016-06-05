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
    // Used to use /users/self/feed, but it got deprectated.
    // http://developers.instagram.com/post/133424514006/instagram-platform-update

    var that = this;
    var following = [];
    var posts = [];
    var nextUrl;

    // Get all the users you follow.
    async.doWhilst(function(callback) {
        var opts = extend({
            url: nextUrl ? nextUrl : '/users/self/follows'
        }, that._requestOptions);
        if (nextUrl) {
            delete opts.baseUrl;
        }

        Helpers.jsonRequest(
            that.job.log,
            opts,
            function(response) {
                console.log(response);
                following = following.concat(response.data);
                that.job.log.debug(util.format('Got %d users', following.length));
                nextUrl = response.pagination.next_url;
                callback();
            },
            callback);

    }, function() {
        return nextUrl;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        // Get the last page of photos from each user.
        async.eachLimit(following, 5, function(user, callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: '/users/' + user.id + '/media/recent'
                }, that._requestOptions),
                function(response) {
                    posts = posts.concat(response.data);
                    callback();
                }
            );
        }, function(err) {
            that.job.log.debug('Got %d posts', posts.length);

            // Throw out all but the latest posts.
            posts.sort(function(a, b) {
                return b.created_time - a.created_time;
            });
            posts = posts.slice(0, 150);

            // Trigger item creation, download, and processing.
            Item.download(Items.Instagram.Media, that, posts, callback);
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
