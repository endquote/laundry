'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js
var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl

// Item which describes a YouTube video
ns('Items.Vimeo', global);
Items.Vimeo.Video = function(config) {
    this.thumbnail = '';
    this.duration = 0;

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Vimeo.Video.prototype = Object.create(Item.prototype);
Items.Vimeo.Video.className = Helpers.buildClassName(__filename);

Items.Vimeo.Video.downloadLogic = function(prefix, obj, washer, cache, download) {
    var targetDate = moment(obj.release_time).toDate();
    var id = obj.uri.split('/').pop();
    return {
        thumbnail: function(callback) {
            // Figure out the biggest thumbnail available.
            var thumbnail = obj.pictures.sizes.sort(function(a, b) {
                return a.width - b.width;
            }).pop();

            // Upload the thumbnail
            var target = prefix + '/' + id + '.jpg';
            Storage.downloadUrl(washer.job.log, thumbnail.link, target, targetDate, cache, false, download, callback);
        },
        video: function(callback) {
            // Upload the video
            var target = prefix + '/' + id + '.mp4';
            Storage.downloadUrl(washer.job.log, obj.link, target, targetDate, cache, true, download, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Vimeo.Video.factory = function(video, downloads) {
    var player = util.format('<img src="%s" />', downloads.thumbnail.newUrl);
    if (downloads.video.newUrl !== downloads.video.oldUrl) {
        player = Item.buildVideo(downloads.video.newUrl, downloads.thumbnail.newUrl, 640, 480);
    }

    var description = video.description || '';
    description = description.replace(/[\n\r]{2,}/gim, '</p><p>');
    description = description.replace(/[\n\r]/gim, '<br/>');
    description = Autolinker.link(description);
    if (description) {
        description = '<p>' + description + '</p>';
    }
    description = player + description;

    var item = new Items.Vimeo.Video({
        date: moment(video.release_time),
        id: video.uri.split('/').pop(),
        title: video.user.name + ': ' + video.name,
        description: description,
        url: video.link,
        author: video.user.name,
        thumbnail: downloads.thumbnail.newUrl,
        mediaUrl: downloads.video.newUrl,
        mediaBytes: downloads.video.bytes,
        duration: video.duration,
        downloads: downloads
    });

    return item;
};

module.exports = Items.Vimeo.Video;
