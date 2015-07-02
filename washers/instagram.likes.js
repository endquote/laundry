'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram Likes washer
input: converts media from the user's Instagram likes into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Likes = function(config) {
    Washers.Instagram.call(this, config);

    this.name = 'Instagram/Likes';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads media you\'ve liked on Instagram.'
    });
};

Washers.Instagram.Likes.prototype = Object.create(Washers.Instagram.prototype);

Washers.Instagram.Likes.prototype.doInput = function(callback) {
    this.beforeInput();
    var that = this;

    ig.use({
        access_token: that.token
    });

    var quantity = 100;
    var items = [];
    var nextMax = null;
    async.whilst(function() {
            return !items.length || (items.length < quantity && nextMax);
        }, function(callback) {
            ig.user_self_liked({
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
                    nextMax = pagination.next_max_like_id;
                    callback(err);
                });
        },
        function(err) {
            callback(err, items);
        });
};

module.exports = Washers.Instagram.Likes;