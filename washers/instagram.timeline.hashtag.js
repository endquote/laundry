'use strict';

/*
Instagram Tag washer
input: converts media from an Instagram tag into items
output: none
*/
ns('Washers.Instagram.Timeline', global);
Washers.Instagram.Timeline.Hashtag = function(config, job) {
    Washers.Instagram.Timeline.call(this, config, job);

    this.name = 'Instagram/Hashtag';
    this.className = Helpers.buildClassName(__filename);
    this.input = _.merge(this.input, {
        description: 'Loads recent images from Instagram with a given hashtag.',
        prompts: [{
            name: 'tag',
            message: 'What tag do you want to watch?',
            filter: function(value) {
                return value.replace('#', '');
            }
        }]
    });
};

Washers.Instagram.Timeline.Hashtag.prototype = Object.create(Washers.Instagram.Timeline.prototype);
Washers.Instagram.Timeline.Hashtag.className = Helpers.buildClassName(__filename);

Washers.Instagram.Timeline.Hashtag.prototype.doInput = function(callback) {
    var that = this;
    this.login(function(err) {
        if (err) {
            callback(err);
            return;
        }
        that.requestMedia('/feed/tag/' + encodeURIComponent(that.tag) + '/', 50, function(err, posts) {
            if (err) {
                callback(err);
                return;
            }
            Item.download(Items.Instagram.Media, that, posts, callback);
        });
    });
};

module.exports = Washers.Instagram.Timeline.Hashtag;
