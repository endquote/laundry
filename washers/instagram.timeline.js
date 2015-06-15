'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram Timeline washer
input: converts videos from the user's Instagram timeline into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Timeline = function(config) {
    Washers.Instagram.call(this, config);

    this.name = 'Instagram/Timeline';
    this.classFile = path.basename(__filename);
    this._oauth2Client = null;

    this.input = _.merge(this.input, {
        description: 'Loads recent images from your Instagram timeline.'
    });
};

Washers.Instagram.Timeline.prototype = _.create(Washers.Instagram.prototype);

Washers.Instagram.Timeline.prototype.doInput = function(callback) {
    var that = this;

    ig.use({
        access_token: that.token
    });

    var sign = {
        client_secret: that.clientSecret,
    };

    var quantity = 150;
    var items = [];
    var nextMax = null;
    async.whilst(function() {
            return !items.length || (items.length < quantity && nextMax);
        }, function(callback) {
            ig.user_self_feed({
                    sign_request: sign,
                    count: quantity - items.length,
                    max_id: nextMax ? nextMax : ''
                },
                function(err, medias, pagination, remaining, limit) {
                    medias.forEach(function(media) {
                        items.push(Items.Instagram.Media.factory(media));
                    });

                    log.debug(util.format('Got %d/%d items', items.length, quantity));
                    nextMax = pagination.next_max_id;
                    callback(err);
                });
        },

        function(err) {
            callback(err, items);
        });
};

module.exports = Washers.Instagram.Timeline;