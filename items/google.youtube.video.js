'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js
var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var AWS = require('aws-sdk');

// Item which describes a YouTube video
ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    this.thumbnail = null;
    Item.call(this, config);
};

Items.Google.YouTube.Video.prototype = Object.create(Item.prototype);

// Convert a video from the api response into a laundry item.
Items.Google.YouTube.Video.factory = function(video, callback) {

    var url = 'https://youtube.com/watch?v=' + video.contentDetails.videoId;

    // Figure out the biggest thumbnail available.
    var thumbnails = [];
    for (var i in video.snippet.thumbnails) {
        thumbnails.push(video.snippet.thumbnails[i]);
    }
    var thumbnail = thumbnails.sort(function(a, b) {
        return a.width - b.width;
    }).pop();

    // Upload the thumbnail
    var thumbTarget = 'Items/Google/YouTube/Video/Thumbnail/' + video.contentDetails.videoId + '.jpg';
    Helpers.uploadUrl(thumbnail.url, false, thumbTarget, function(thumbnailUrl) {

        // Upload the video
        var mediaTarget = 'Items/Google/YouTube/Video/' + video.contentDetails.videoId + '.mp4';
        Helpers.uploadUrl(url, true, mediaTarget, function(videoUrl) {

            var player = util.format('<p><video controls poster="%s" src="%s" autobuffer="false" preload="none"></video></p>', thumbnailUrl, videoUrl);
            var description = video.snippet.description;
            description = description.replace(/[\n\r]{2,}/gim, '</p><p>');
            description = description.replace(/[\n\r]/gim, '<br/>');
            description = Autolinker.link(description);
            description = player + '<p>' + description + '</p>';

            var item = new Items.Google.YouTube.Video({
                title: video.snippet.channelTitle + ': ' + video.snippet.title,
                description: description,
                url: url,
                date: moment(video.snippet.publishedAt),
                author: video.snippet.channelTitle,
                thumbnail: thumbnailUrl,
                mediaUrl: videoUrl
            });

            callback(item);
        });
    });
};

Items.Google.YouTube.Video.deleteMediaBefore = function(date, callback) {
    Helpers.deleteBefore('Items/Google/YouTube/Video/Thumbnail/', date, function(err) {
        Helpers.deleteBefore('Items/Google/YouTube/Video/', date, function(err) {
            callback(err);
        });
    });
};

module.exports = Items.Google.YouTube.Video;
