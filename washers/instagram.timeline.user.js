'use strict';

/*
Instagram User washer
input: converts media from a user's Instagram feed into items
output: none
*/
ns('Washers.Instagram.Timeline', global);
Washers.Instagram.Timeline.User = function(config, job) {
    this.userId = null;

    Washers.Instagram.Timeline.call(this, config, job);

    this.name = 'Instagram/User';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from an Instagram account.',
        settings: [{
            name: 'username',
            prompt: 'What account do you want to watch?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
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
    Helpers.jsonRequest({
            url: 'https://api.instagram.com/v1/users/search',
            qs: {
                count: 1,
                q: username,
                access_token: that.token
            }
        },
        function(response) {
            that.userId = response.data[0].id;
            callback();
        },
        callback);
};

Washers.Instagram.Timeline.User.prototype.doInput = function(callback) {
    this.requestMedia('/users/' + this.userId + '/media/recent', callback);
};

module.exports = Washers.Instagram.Timeline.User;
