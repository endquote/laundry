'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Youtube Timeline washer
input: converts videos from the user's YouTube Timeline into items
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

    async.waterfall([

        function(callback) {
            var quantity = 100;
            var items = [];
            var nextMax = null;
            async.doWhilst(function(callback) {
                ig.user_self_feed({
                    sign_request: sign,
                    count: 100,
                    max_id: nextMax ? nextMax : ''
                }, function(err, medias, pagination, remaining, limit) {
                    medias.forEach(function(media) {
                        var item = new Items.Instagram.Media({
                            tags: media.tags,
                            type: media.type,
                            comments: media.comments,
                            date: moment.unix(media.created_time),
                            link: media.link,
                            likes: media.likes,
                            image: media.images.standard_resolution.url,
                            caption: media.caption ? media.caption.text : null,
                            username: media.user.username,
                            userpic: media.user.profile_picture,
                            liked: media.user_has_liked
                        });
                        // build description
                        items.push(item);
                    });

                    log.debug(util.format('Got %d/%d items', items.length, quantity));
                    nextMax = pagination.next_max_id;
                    callback();
                });
            }, function() {
                return nextMax !== null && items.length <= quantity;
            }, function(err) {
                items = items.slice(0, quantity);
                callback(null, items);
            });
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Instagram.Timeline;