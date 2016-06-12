'use strict';

/*
Instagram Likes washer
input: converts media from the user's Instagram likes into items
output: none
*/
ns('Washers.Instagram.Timeline', global);
Washers.Instagram.Timeline.Likes = function(config, job) {
    Washers.Instagram.Timeline.call(this, config, job);

    this.name = 'Instagram/Likes';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads media you\'ve liked on Instagram.'
    });
};

Washers.Instagram.Timeline.Likes.prototype = Object.create(Washers.Instagram.Timeline.prototype);
Washers.Instagram.Timeline.Likes.className = Helpers.buildClassName(__filename);

Washers.Instagram.Timeline.Likes.prototype.doInput = function(callback) {
    var that = this;
    this.login(function(err) {
        if (err) {
            callback(err);
            return;
        }
        that.requestMedia('/feed/liked/', 50, function(err, posts) {
            if (err) {
                callback(err);
                return;
            }
            Item.download(Items.Instagram.Media, that, posts, callback);
        });
    });
};

module.exports = Washers.Instagram.Timeline.Likes;
