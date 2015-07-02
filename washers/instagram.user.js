'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram User washer
input: converts media from a user's Instagram feed into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.User = function(config) {
    this.userId = null;

    Washers.Instagram.call(this, config);

    this.name = 'Instagram/User';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from an Instagram account.',
        settings: [{
            name: 'userName',
            prompt: 'What account do you want to watch?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Instagram.User.prototype = Object.create(Washers.Instagram.prototype);

Washers.Instagram.User.prototype.doInput = function(callback) {
    this.beforeInput();
    var that = this;

    ig.use({
        access_token: that.token
    });

    var quantity = 50;
    var items = [];
    var nextMax = null;

    async.waterfall([

        // Search for the username to get the user id.
        function(callback) {
            if (that.userId) {
                callback();
                return;
            }

            ig.user_search(that.userName, {
                    sign_request: {
                        client_secret: that.clientSecret,
                    },
                    count: 1
                },
                function(err, users, remaining, limit) {
                    if (err || !users.length) {
                        callback(err);
                        return;
                    }
                    that.userId = users[0].id;
                    callback(err);
                });
        },
        function(callback) {
            // Get the user's media.
            async.whilst(function() {
                    return !items.length || (items.length < quantity && nextMax);
                }, function(callback) {
                    ig.user_media_recent(that.userId, {
                            sign_request: {
                                client_secret: that.clientSecret,
                            },
                            count: quantity - items.length,
                            max_id: nextMax ? nextMax : ''
                        },
                        function(err, medias, pagination, remaining, limit) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            medias.forEach(function(media) {
                                items.push(Items.Instagram.Media.factory(media));
                            });
                            log.debug(util.format('Got %d/%d items', items.length, quantity));
                            nextMax = pagination.next_max_id;
                            callback(err);
                        });
                },
                function(err) {
                    callback(err, items);
                });
        },
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Instagram.User;