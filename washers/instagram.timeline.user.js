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
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from an Instagram account.',
        prompts: [{
            type: 'input',
            name: 'username',
            message: 'What account do you want to watch?',
            filter: function(value) {
                return value.replace('@', '');
            },
            validate: function(value, answers) {
                if (validator.isWhitespace(value)) {
                    return false;
                }

                // Get the userid for the username.
                var done = this.async();
                Helpers.jsonRequest(
                    null, {
                        url: 'https://api.instagram.com/v1/users/search',
                        qs: {
                            count: 1,
                            q: value,
                            access_token: job.input.token
                        }
                    },
                    function(response) {
                        if (response.data.length) {
                            answers.userId = response.data[0].id;
                            done(null, true);
                        } else {
                            done(null, false);
                        }
                    },
                    function(err) {
                        done(null, false);
                    });
            }
        }]
    });
};

Washers.Instagram.Timeline.User.prototype = Object.create(Washers.Instagram.Timeline.prototype);
Washers.Instagram.Timeline.User.className = Helpers.buildClassName(__filename);

Washers.Instagram.Timeline.User.prototype.doInput = function(callback) {
    this.requestMedia('/users/' + this.userId + '/media/recent', callback);
};

module.exports = Washers.Instagram.Timeline.User;
