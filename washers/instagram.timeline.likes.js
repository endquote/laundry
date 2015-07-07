'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram Likes washer
input: converts media from the user's Instagram likes into items
output: none
*/
ns('Washers.Instagram.Timeline', global);
Washers.Instagram.Timeline.Likes = function(config) {
    Washers.Instagram.Timeline.call(this, config);

    this.name = 'Instagram/Likes';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads media you\'ve liked on Instagram.'
    });
};

Washers.Instagram.Timeline.Likes.prototype = Object.create(Washers.Instagram.Timeline.prototype);

Washers.Instagram.Timeline.Likes.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestMedia('user_self_liked', null, callback);
};

module.exports = Washers.Instagram.Timeline.Likes;