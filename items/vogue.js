'use strict';

// Item which describes a Vogue fashion show object

ns('Items', global);
Items.Vogue = function(config) {
    this.review = '';
    this.slides = [];

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Vogue.prototype = Object.create(Item.prototype);
Items.Vogue.className = Helpers.buildClassName(__filename);

Items.Vogue.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        slides: function(callback) {
            var results = [];
            async.forEachOfLimit(obj.slides, 3, function(slide, index, callback) {
                var target = util.format('%s/%s/%d.jpg', prefix, obj.id, index + 1);
                var targetDate = obj.date;
                Storage.downloadUrl(washer.job.log, slide, target, targetDate, cache, false, download, function(err, res) {
                    results[index] = res;
                    callback();
                });
            }, function(err) {
                callback(err, results);
            });
        }
    };
};

Items.Vogue.factory = function(item, downloads) {
    var url = util.format('http://www.vogue.com/fashion-shows/%s', item.urlFragment);

    var description = '';
    if (item.review) {
        description += item.review + '\n';
    }

    downloads.slides.forEach(function(slide, index) {
        description += util.format('<p><a href="%s/slideshow/collection#%d"><img src="%s"/></a></p>\n', url, index + 1, slide.newUrl);
    });

    return new Items.Vogue({
        title: item.name,
        description: description,
        url: url,
        date: moment(item.pubDate),
        author: item.brandName,
        slides: item.slides,
        downloads: downloads
    });
};

module.exports = Items.Vogue;
