'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram User washer
input: converts media from a user's Instagram feed into items
output: none
*/
ns('Washers.Instagram.Timeline', global);
Washers.Instagram.Timeline.User = function(config) {
    this.userId = null;

    Washers.Instagram.Timeline.call(this, config);

    this.name = 'Instagram/User';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from an Instagram account.',
        settings: [{
            name: 'username',
            prompt: 'What account do you want to watch?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (validator.isWhitespace(newValue)) {
                    callback(true);
                    return;
                }

                this.getUserId(newValue, function(err) {
                    callback(err);
                });
            }
        }]
    });
};

Washers.Instagram.Timeline.User.prototype = Object.create(Washers.Instagram.Timeline.prototype);

Washers.Instagram.Timeline.User.prototype.getUserId = function(username, callback) {
    var that = this;

    ig.use({
        access_token: that.token
    });

    ig.user_search(username, {
            sign_request: {
                client_secret: that.clientSecret,
            },
            count: 1
        },
        function(err, users, remaining, limit) {
            if (err || !users.length) {
                callback(true);
                return;
            }
            that.userId = users[0].id;
            callback(err);
        });
};

Washers.Instagram.Timeline.User.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestMedia('user_media_recent', this.userId, callback);
};

module.exports = Washers.Instagram.Timeline.User;