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
    var targetDate = moment(obj.clip.release_time).toDate();
    var id = obj.clip.uri.split('/').pop();
    return {
        thumbnail: function(callback) {
            // Figure out the biggest thumbnail available.
            var thumbnail = obj.clip.pictures.sizes.sort(function(a, b) {
                return a.width - b.width;
            }).pop();

            // Upload the thumbnail
            var target = prefix + '/' + id + '.jpg';
            Storage.downloadUrl(washer.job.log, thumbnail.link, target, targetDate, cache, false, download, callback);
        },
        video: function(callback) {
            // Upload the video
            var target = prefix + '/' + id + '.mp4';
            Storage.downloadUrl(washer.job.log, obj.clip.link, target, targetDate, cache, true, download, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Vimeo.Video.factory = function(video, downloads) {
    var player = util.format('<img src="%s" />', downloads.thumbnail.newUrl);
    if (downloads.video.newUrl !== downloads.video.oldUrl) {
        player = Item.buildVideo(downloads.video.newUrl, downloads.thumbnail.newUrl, 640, 480);
    }

    var description = video.clip.description || '';
    description = description.replace(/[\n\r]{2,}/gim, '</p><p>');
    description = description.replace(/[\n\r]/gim, '<br/>');
    description = Autolinker.link(description);
    description = player + '<p>' + description + '</p>';

    var item = new Items.Vimeo.Video({
        id: video.clip.uri.split('/').pop(),
        title: video.clip.user.name + ': ' + video.clip.name,
        description: description,
        url: video.clip.link,
        date: moment(video.clip.release_time),
        author: video.clip.user.name,
        thumbnail: downloads.thumbnail.newUrl,
        mediaUrl: downloads.video.newUrl,
        mediaBytes: downloads.video.bytes,
        duration: video.clip.duration,
        downloads: downloads
    });

    return item;
};

module.exports = Items.Vimeo.Video;
