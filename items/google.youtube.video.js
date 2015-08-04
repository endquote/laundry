'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js
var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var AWS = require('aws-sdk');

// Item which describes a YouTube video
ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    this.thumbnail = null;

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Google.YouTube.Video.prototype = Object.create(Item.prototype);
Items.Google.YouTube.Video.className = Helpers.buildClassName(__filename);

// Convert an array of videos from the API response into Laundry Items, including handling uploads.
Items.Google.YouTube.Video.factory = function(jobName, videos, callback) {
    var prefix = (jobName + '.' + Items.Google.YouTube.Video.className).toLowerCase().split('.').join('/');
    var items = [];
    var newKeys = [];
    var oldKeys = [];

    async.waterfall([

        // Cache existing newKeys so they're not uploaded again.
        function(callback) {
            Helpers.cacheObjects(prefix, function(err, c) {
                oldKeys = c;
                callback(err);
            });
        },
        function(callback) {

            // Process each video object.
            async.eachLimit(videos, 10, function(video, callback) {
                var url = 'https://youtube.com/watch?v=' + video.contentDetails.videoId;

                // Figure out the biggest thumbnail available.
                var thumbnails = [];
                for (var i in video.snippet.thumbnails) {
                    thumbnails.push(video.snippet.thumbnails[i]);
                }
                var thumbnail = thumbnails.sort(function(a, b) {
                    return a.width - b.width;
                }).pop();

                // Upload files.
                async.parallel({

                    thumbnailUrl: function(callback) {
                        // Upload the thumbnail
                        var target = prefix + '/' + video.contentDetails.videoId + '.jpg';
                        newKeys.push(target);
                        Helpers.uploadUrl(thumbnail.url, target, oldKeys, false, callback);
                    },
                    videoUrl: function(callback) {
                        // Upload the video
                        var target = prefix + '/' + video.contentDetails.videoId + '.mp4';
                        newKeys.push(target);
                        Helpers.uploadUrl(url, target, oldKeys, true, callback);
                    }
                }, function(err, uploads) {
                    if (err) {
                        // Carry on when an upload fails.
                        log.warn(err);
                        callback();
                        return;
                    }

                    // Build the actual item object.
                    var player = util.format('<p><video controls poster="%s" src="%s" autobuffer="false" preload="none"></video></p>', uploads.thumbnailUrl, uploads.videoUrl);
                    var description = video.snippet.description;
                    description = description.replace(/[\n\r]{2,}/gim, '</p><p>');
                    description = description.replace(/[\n\r]/gim, '<br/>');
                    description = Autolinker.link(description);
                    description = player + '<p>' + description + '</p>';

                    var item = new Items.Google.YouTube.Video({
                        id: video.contentDetails.videoId,
                        title: video.snippet.channelTitle + ': ' + video.snippet.title,
                        description: description,
                        url: url,
                        date: moment(video.snippet.publishedAt),
                        author: video.snippet.channelTitle,
                        thumbnail: uploads.thumbnailUrl,
                        mediaUrl: uploads.videoUrl
                    });

                    items.push(item);
                    callback();
                });
            }, callback);
        },

        // Delete any old stuff in the cache.
        function(callback) {
            Helpers.deleteExpired(newKeys, oldKeys, callback);
        }
    ], function(err) {
        // Return all the constructed items.
        callback(err, items);
    });
};

module.exports = Items.Google.YouTube.Video;
