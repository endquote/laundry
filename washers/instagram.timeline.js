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
        prompts: [
            Washer.downloadMediaOption(), {
                type: 'input',
                name: 'quantityPerUser',
                message: 'How many items do you want to retrieve per user?',
                default: 18,
                validate: function(value, answers) {
                    return value && validator.isInt(value.toString());
                }
            }
        ]
    });
};

Washers.Instagram.Timeline.prototype = Object.create(Washers.Instagram.prototype);
Washers.Instagram.Timeline.className = Helpers.buildClassName(__filename);

Washers.Instagram.Timeline.prototype.doInput = function(callback) {
    var that = this;
    var following = [];
    var posts = [];

    // Log in.
    this.login(function(err) {
        if (err) {
            callback(err);
            return;
        }

        // Get the list of users we're following, it's a paged list.
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

            // Get the last page of photos from each user. More than 18 requires a second page.
            async.eachLimit(following, 5, function(user, callback) {
                that.requestMedia('feed/user/' + user.pk + '/', that.quantityPerUser,
                    function(err, items) {
                        posts = posts.concat(items);
                        callback(err);
                    }
                );
            }, function(err) {

                that.job.log.debug('Got %d posts', posts.length);

                // Throw out all but the latest posts.
                posts.sort(function(a, b) {
                    return b.taken_at - a.taken_at;
                });
                posts = posts.slice(0, 500);

                // Trigger item creation, download, and processing.
                Item.download(Items.Instagram.Media, that, posts, callback);
            });
        });
    });
};

module.exports = Washers.Instagram.Timeline;
