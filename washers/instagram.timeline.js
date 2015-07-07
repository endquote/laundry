'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram Timeline washer
input: converts media from the user's Instagram timeline into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Timeline = function(config) {
    Washers.Instagram.call(this, config);

    this.name = 'Instagram/Timeline';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from your Instagram timeline.'
    });
};

Washers.Instagram.Timeline.prototype = Object.create(Washers.Instagram.prototype);

Washers.Instagram.Timeline.prototype.doInput = function(callback) {
    this.beforeInput();
    this.requestMedia('user_self_feed', null, callback);
};

Washers.Instagram.Timeline.prototype.requestMedia = function(method, arg, callback) {
    var that = this;

    ig.use({
        access_token: that.token
    });

    var quantity = 150;
    var items = [];
    var nextMax = null;
    async.whilst(function() {
            return !items.length || (items.length < quantity && nextMax);
        }, function(callback) {

            var options = {
                sign_request: {
                    client_secret: that.clientSecret,
                },
                count: quantity - items.length,
                max_id: nextMax ? nextMax : ''
            };

            var handleResult = function(err, medias, pagination, remaining, limit) {
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
            };

            if (arg) {
                ig[method](arg, options, handleResult);
            } else {
                ig[method](options, handleResult);
            }
        },
        function(err) {
            callback(err, items);
        });
};
/*

                    ig.user_media_recent(that.userId, {
                            sign_request: {
                                client_secret: that.clientSecret,
                            },
                            count: quantity - items.length,
                            max_id: nextMax ? nextMax : ''
                        },

*/


module.exports = Washers.Instagram.Timeline;