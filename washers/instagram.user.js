'use strict';

/*
Instagram User washer
input: converts media from a user's Instagram feed into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.User = function(config, job) {
    this.userId = null;

    Washers.Instagram.call(this, config, job);

    this.name = 'Instagram/User';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from an Instagram account.',
        prompts: [{
                name: 'targetUser',
                message: 'What account do you want to watch?',
                filter: function(value) {
                    return value.replace('@', '');
                }
            },
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 50)
        ]
    });
};

Washers.Instagram.User.prototype = Object.create(Washers.Instagram.prototype);
Washers.Instagram.User.className = Helpers.buildClassName(__filename);

Washers.Instagram.User.prototype.doInput = function(callback) {
    var that = this;

    // Log in.
    this.login(function(err) {
        if (err) {
            callback(err);
            return;
        }

        // Get the userid for the username.
        Helpers.jsonRequest(
            that.job.log,
            extend({
                jar: that._jar,
                url: util.format('users/%s/usernameinfo/', that.targetUser),
            }, that._requestOptions),

            function(response) {
                // Get the user's feed.
                that.requestMedia('/feed/user/' + response.user.pk + '/', that.quantity, function(err, posts) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    Item.download(Items.Instagram.Media, that, posts, callback);
                });
            },
            callback);
    });
};

module.exports = Washers.Instagram.User;
