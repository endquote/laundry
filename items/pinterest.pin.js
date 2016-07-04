'use strict';

var urlParse = require('url');

// Item which describes a Pinterest pin
ns('Items.Pinterest', global);
Items.Pinterest.Pin = function(config) {
    this.id = '';
    this.type = '';
    this.color = '';
    this.source = '';
    this.image = '';
    this.note = '';
    this.coordinates = {
        lat: 0,
        lon: 0
    };

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Pinterest.Pin.prototype = Object.create(Item.prototype);
Items.Pinterest.Pin.className = Helpers.buildClassName(__filename);

Items.Pinterest.Pin.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        image: function(callback) {
            var targetDate = moment(obj.created_at).toDate();
            var ext = path.parse(urlParse.parse(obj.image.original.url).pathname).ext;
            var target = prefix + '/' + obj.id + ext;
            Storage.downloadUrl(washer.job.log, obj.image.original.url, target, targetDate, cache, false, download, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Pinterest.Pin.factory = function(pin, downloads) {
    var item = new Items.Pinterest.Pin({
        title: '',
        description: '',
        url: pin.url,
        date: moment(pin.created_at),
        author: pin.creator.url.split('/')[3],
        tags: [pin.board.name],
        type: pin.media.type,
        color: pin.color,
        source: pin.link,
        id: pin.id,
        image: downloads.image.newUrl,
        note: pin.note,
        downloads: downloads,
    });

    if (pin.metadata.place) {
        item.coordinates = {
            lat: pin.metadata.place.latitude,
            lon: pin.metadata.place.longitude
        };
    }

    if (pin.note) {
        item.description += util.format('<p>%s</p>', pin.note);
    }

    if (pin.image) {
        item.description += util.format('<img src="%s" width="%d" height="%d" />',
            downloads.image.newUrl, pin.image.original.width, pin.image.original.height);
    }

    if (pin.metadata.place) {
        var place = pin.metadata.place;
        item.description += util.format('<p><a href="http://maps.apple.com/?q=%s&ll=%s,%s">%s</a></p>',
            encodeURIComponent(place.name), place.latitude, place.longitude, place.name);
    }

    item.title = pin.attribution ? pin.attribution.title : Helpers.shortenString(S(item.description).stripTags(), 30);

    return item;
};

module.exports = Items.Pinterest.Pin;
