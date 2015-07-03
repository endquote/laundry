'use strict';

var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client
var youtube = google.youtube('v3'); // https://developers.google.com/youtube/v3/docs/

/*
Youtube Subscriptions washer
input: converts videos from the user's YouTube subscriptions into items
output: none
*/
ns('Washers.Google.YouTube', global);
Washers.Google.YouTube.Subscriptions = function(config) {
    Washers.Google.YouTube.call(this, config);

    this.name = 'YouTube/Subscriptions';
    this.className = Helpers.classNameFromFile(__filename);
    this._oauth2Client = null;

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from your YouTube subscriptions.'
    });
};

Washers.Google.YouTube.Subscriptions.prototype = Object.create(Washers.Google.YouTube.prototype);

Washers.Google.YouTube.Subscriptions.prototype.doInput = function(callback) {
    this.beforeInput();
    var that = this;

    async.waterfall([

        // Refresh the auth token
        function(callback) {
            that.refreshAccessToken(callback);
        },

        // Call the subscriptions API to get all of the subscriptions.
        function(callback) {

            var subscriptions = [];
            var nextPageToken = null;

            async.doWhilst(function(callback) {

                // https://developers.google.com/youtube/v3/docs/subscriptions/list
                youtube.subscriptions.list({
                    part: 'id,snippet',
                    mine: true,
                    auth: that._oauth2Client,
                    maxResults: 50,
                    pageToken: nextPageToken
                }, function(err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    nextPageToken = result.nextPageToken;
                    result.items.forEach(function(subscription, index, array) {
                        subscriptions.push({
                            subscription: subscription
                        });
                    });

                    log.debug('Got ' + subscriptions.length + ' subscriptions');
                    callback();
                });
            }, function() {
                return nextPageToken;
            }, function(err) {
                callback(err, subscriptions);
            });
        },

        // For each subscription, find the channel, for the channel, find the upload playlist.
        function(subscriptions, callback) {
            async.eachLimit(subscriptions, 10, function(subscription, callback) {
                var index = subscriptions.indexOf(subscription);
                var channelId = subscription.subscription.snippet.resourceId.channelId;
                subscriptions[index].channelId = channelId;

                // https://developers.google.com/youtube/v3/docs/channels/list
                log.debug('Getting playlist for channel ' + channelId);
                youtube.channels.list({
                    part: 'contentDetails',
                    auth: that._oauth2Client,
                    id: channelId
                }, function(err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    var playlistId = result.items[0].contentDetails.relatedPlaylists.uploads;
                    subscriptions[index].playlistId = playlistId;
                    callback();
                });
            }, function(err) {
                callback(err, subscriptions);
            });
        },

        // For each subscription, get the latest videos on the upload playlist.
        function(subscriptions, callback) {
            async.eachLimit(subscriptions, 10, function(subscription, callback) {
                var index = subscriptions.indexOf(subscription);

                // https://developers.google.com/youtube/v3/docs/playlistItems/list
                log.debug('Getting videos for playlist ' + subscription.playlistId);
                youtube.playlistItems.list({
                    part: 'id,contentDetails,snippet',
                    auth: that._oauth2Client,
                    playlistId: subscription.playlistId,
                    maxResults: 5
                }, function(err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    subscriptions[index].videos = result.items;
                    callback();
                });
            }, function(err) {
                callback(err, subscriptions);
            });
        },

        // Parse the subscriptions list into a list of videos in order.
        function(subscriptions, callback) {
            var maxVideos = 50;
            var videos = [];
            subscriptions.forEach(function(subscription, index, array) {
                videos = videos.concat(subscription.videos);
            });

            log.debug('Reducing ' + videos.length + ' videos to ' + maxVideos);

            videos.sort(function(a, b) {
                return new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime();
            });

            videos = videos.slice(0, 50);
            callback(null, videos);
        },

        // Parse the video objects into output objects.
        function(videos, callback) {

            var parsed = [];
            videos.forEach(function(video, index, array) {
                parsed.push(Items.Google.YouTube.Video.factory(video));
            });

            callback(null, parsed);
        },

    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Subscriptions;