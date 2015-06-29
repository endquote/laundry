'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Instagram Tag washer
input: converts media from an Instagram tag into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Tag = function(config) {
    Washers.Instagram.call(this, config);

    this.name = 'Instagram/Tag';
    this.className = path.basename(__filename.replace('.js', ''));
    this.input = _.merge(this.input, {
        description: 'Loads recent images from Instagram with a given tag.',
        settings: [{
            name: 'tag',
            prompt: 'What tag do you want to watch?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Instagram.Tag.prototype = _.create(Washers.Instagram.prototype);

Washers.Instagram.Tag.prototype.doInput = function(callback) {
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
            ig.tag_media_recent(that.tag, {
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
                    nextMax = pagination.next_max_id;
                    callback(err);
                });
        },
        function(err) {
            callback(err, items);
        });
};

module.exports = Washers.Instagram.Tag;