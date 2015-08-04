'use strict';

/*
Instagram Timeline washer
input: converts media from the user's Instagram timeline into items
output: none
*/
ns('Washers.Instagram', global);
Washers.Instagram.Timeline = function(config, job) {
    Washers.Instagram.call(this, config, job);

    this.name = 'Instagram/Timeline';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent images from your Instagram timeline.'
    });
};

Washers.Instagram.Timeline.prototype = Object.create(Washers.Instagram.prototype);
Washers.Instagram.Timeline.className = Helpers.buildClassName(__filename);

Washers.Instagram.Timeline.prototype.doInput = function(callback) {
    this.requestMedia('/users/self/feed', callback);
};

Washers.Instagram.Timeline.prototype.requestMedia = function(method, callback) {
    var that = this;

    var quantity = 150;
    var items = [];
    var nextMax = null;
    async.whilst(function() {
            return !items.length || (items.length < quantity && nextMax);
        }, function(callback) {
            Helpers.jsonRequest(
                extend({
                    url: method,
                    qs: {
                        count: quantity - items.length,
                        max_id: nextMax ? nextMax : ''
                    }
                }, that._requestOptions),
                function(response) {
                    response.data.forEach(function(media) {
                        items.push(Items.Instagram.Media.factory(media));
                    });
                    log.debug(util.format('Got %d/%d items', items.length, quantity));
                    nextMax = response.pagination.next_max_id;
                    callback();
                },
                callback);
        },
        function(err) {
            callback(err, items);
        });
};

module.exports = Washers.Instagram.Timeline;
