'use strict';

/*
Instagram Likes washer
input: converts media from the user's Instagram likes into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Likes = function(config, job) {
    Washers.Instagram.call(this, config, job);

    this.name = 'Instagram/Likes';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads media you\'ve liked on Instagram.',
        prompts: [
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 50)
        ]
    });
};

Washers.Instagram.Likes.prototype = Object.create(Washers.Instagram.prototype);
Washers.Instagram.Likes.className = Helpers.buildClassName(__filename);

Washers.Instagram.Likes.prototype.doInput = function(callback) {
    var that = this;
    this.login(function(err) {
        if (err) {
            callback(err);
            return;
        }
        that.requestMedia('/feed/liked/', that.quantity, function(err, posts) {
            if (err) {
                callback(err);
                return;
            }
            Item.download(Items.Instagram.Media, that, posts, callback);
        });
    });
};

module.exports = Washers.Instagram.Likes;
