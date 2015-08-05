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

// Given a collection of API responses, perform downloads and construct Item objects.
Items.Google.YouTube.Video.download = function(jobName, videos, callback) {
    var prefix = Item.buildPrefix(jobName, Items.Google.YouTube.Video.className);
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
            async.eachLimit(videos, 5, function(video, callback) {
                // Upload files.
                async.parallel({

                    thumbnail: function(callback) {
                        // Figure out the biggest thumbnail available.
                        var thumbnails = [];
                        for (var i in video.snippet.thumbnails) {
                            thumbnails.push(video.snippet.thumbnails[i]);
                        }
                        var thumbnail = thumbnails.sort(function(a, b) {
                            return a.width - b.width;
                        }).pop();

                        // Upload the thumbnail
                        var target = prefix + '/' + video.contentDetails.videoId + '.jpg';
                        newKeys.push(target);
                        Helpers.uploadUrl(thumbnail.url, target, oldKeys, false, callback);
                    },
                    video: function(callback) {
                        // Upload the video
                        var target = prefix + '/' + video.contentDetails.videoId + '.mp4';
                        newKeys.push(target);
                        Helpers.uploadUrl('https://youtube.com/watch?v=' + video.contentDetails.videoId, target, oldKeys, true, callback);
                    }
                }, function(err, uploads) {
                    if (err) {
                        // Carry on when an upload fails.
                        log.warn(err);
                        callback();
                        return;
                    }

                    items.push(Items.Google.YouTube.Video.factory(video, uploads));
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

// Construct an Item given an API response and any upload info.
Items.Google.YouTube.Video.factory = function(video, uploads) {
    var player = Item.buildVideo(uploads.video.newUrl, uploads.thumbnail.newUrl);
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
        thumbnail: uploads.thumbnail.newUrl,
        mediaUrl: uploads.video.newUrl
    });

    return item;
};

module.exports = Items.Google.YouTube.Video;
