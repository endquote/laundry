'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js
var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var AWS = require('aws-sdk');

// Item which describes a YouTube video
ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    this.thumbnail = '';
    this.duration = 0;

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Google.YouTube.Video.prototype = Object.create(Item.prototype);
Items.Google.YouTube.Video.className = Helpers.buildClassName(__filename);

Items.Google.YouTube.Video.downloadLogic = function(prefix, obj, washer, cache, download) {
    var targetDate = moment(obj.snippet.publishedAt).toDate();
    return {
        thumbnail: function(callback) {
            // Figure out the biggest thumbnail available.
            var thumbnails = [];
            for (var i in obj.snippet.thumbnails) {
                thumbnails.push(obj.snippet.thumbnails[i]);
            }
            var thumbnail = thumbnails.sort(function(a, b) {
                return a.width - b.width;
            }).pop();

            // Upload the thumbnail
            var target = prefix + '/' + obj.contentDetails.videoId + '.jpg';
            Storage.downloadUrl(washer.job.log, thumbnail.url, target, targetDate, cache, false, download, callback);
        },
        video: function(callback) {
            // Upload the video
            var target = prefix + '/' + obj.contentDetails.videoId + '.mp4';
            Storage.downloadUrl(washer.job.log, 'https://youtube.com/watch?v=' + obj.contentDetails.videoId, target, targetDate, cache, true, download, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Google.YouTube.Video.factory = function(video, downloads) {
    var player = util.format('<img src="%s" />', downloads.thumbnail.newUrl);
    if (downloads.video.newUrl !== downloads.video.oldUrl) {
        player = Item.buildVideo(downloads.video.newUrl, downloads.thumbnail.newUrl, 640, 480);
    }

    var description = video.snippet.description;
    description = description.replace(/[\n\r]{2,}/gim, '</p><p>');
    description = description.replace(/[\n\r]/gim, '<br/>');
    description = Autolinker.link(description);
    description = player + '<p>' + description + '</p>';

    var item = new Items.Google.YouTube.Video({
        id: video.contentDetails.videoId,
        title: video.snippet.channelTitle + ': ' + video.snippet.title,
        description: description,
        url: 'https://youtube.com/watch?v=' + video.contentDetails.videoId,
        date: moment(video.snippet.publishedAt),
        author: video.snippet.channelTitle,
        thumbnail: downloads.thumbnail.newUrl,
        mediaUrl: downloads.video.newUrl,
        mediaBytes: downloads.video.bytes,
        duration: video.duration,
        downloads: downloads
    });

    return item;
};

module.exports = Items.Google.YouTube.Video;
