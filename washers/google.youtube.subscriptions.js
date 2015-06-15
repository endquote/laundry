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

    // Save the mapping between subscription, channel, and playlist.
    this.cache = {};

    Washers.Google.YouTube.call(this, config);

    this.name = 'YouTube/Subscriptions';
    this.classFile = path.basename(__filename);
    this._oauth2Client = null;

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from your YouTube subscriptions.'
    });
};

Washers.Google.YouTube.Subscriptions.prototype = _.create(Washers.Google.YouTube.prototype);

Washers.Google.YouTube.Subscriptions.prototype.doInput = function(callback) {
    var that = this;

    async.waterfall([

        // Refresh the auth token
        function(callback) {
            that.refreshAccessToken(callback);
        },
        // Call the subscriptions API to get all of the subscriptions.
        function(callback) {

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
                        if (!that.cache[subscription.id]) {
                            that.cache[subscription.id] = {
                                channel: subscription.snippet.resourceId.channelId
                            };
                        }
                    });

                    log.debug('Got ' + result.items.length + ' subscriptions');
                    callback();
                });
            }, function() {
                return nextPageToken;
            }, function(err) {
                callback(err);
            });
        },

        // For each subscription, find the channel, for the channel, find the upload playlist.
        function(callback) {
            var subscriptionIds = [];
            for (var i in that.cache) {
                subscriptionIds.push(i);
            }

            async.eachLimit(subscriptionIds, 10, function(subscriptionId, callback) {
                if (that.cache[subscriptionId].playlist) {
                    callback();
                    return;
                }

                // https://developers.google.com/youtube/v3/docs/channels/list
                log.debug('Getting playlist for channel ' + that.cache[subscriptionId].channel);
                youtube.channels.list({
                    part: 'contentDetails',
                    auth: that._oauth2Client,
                    id: that.cache[subscriptionId].channel
                }, function(err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    that.cache[subscriptionId].playlist = result.items[0].contentDetails.relatedPlaylists.uploads;
                    callback();
                });
            }, function(err) {
                callback(err);
            });
        },

        // For each subscription, get the latest videos on the upload playlist.
        function(callback) {
            var subscriptionIds = [];
            for (var i in that.cache) {
                subscriptionIds.push(i);
            }

            var videos = [];
            async.eachLimit(subscriptionIds, 10, function(subscriptionId, callback) {
                // https://developers.google.com/youtube/v3/docs/playlistItems/list
                log.debug('Getting videos for playlist ' + that.cache[subscriptionId].playlist);
                youtube.playlistItems.list({
                    part: 'id,contentDetails,snippet',
                    auth: that._oauth2Client,
                    playlistId: that.cache[subscriptionId].playlist,
                    maxResults: 5
                }, function(err, result) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    videos = videos.concat(result.items);
                    callback();
                });
            }, function(err) {
                callback(err, videos);
            });
        },

        // Parse the subscriptions list into a list of videos in order.
        function(videos, callback) {
            var maxVideos = 50;

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
                parsed.push(that.parseItem(video));
            });

            callback(null, parsed);
        },

    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Subscriptions;