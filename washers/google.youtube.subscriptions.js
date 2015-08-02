'use strict';

/*
Youtube Subscriptions washer
input: converts videos from the user's YouTube subscriptions into items
output: none
*/
ns('Washers.Google.YouTube', global);
Washers.Google.YouTube.Subscriptions = function(config, job) {
    Washers.Google.YouTube.call(this, config, job);

    this.name = 'YouTube/Subscriptions';

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from your YouTube subscriptions.'
    });
};

Washers.Google.YouTube.Subscriptions.prototype = Object.create(Washers.Google.YouTube.prototype);

Washers.Google.YouTube.Subscriptions.prototype.doInput = function(callback) {
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
                Helpers.jsonRequest(
                    extend({
                        url: '/subscriptions',
                        qs: {
                            part: 'id,snippet',
                            mine: true,
                            auth: that._oauth2Client,
                            maxResults: 50,
                            pageToken: nextPageToken
                        }
                    }, that._requestOptions),
                    function(result) {
                        nextPageToken = result.nextPageToken;
                        result.items.forEach(function(subscription, index, array) {
                            subscriptions.push({
                                subscription: subscription
                            });
                        });

                        log.debug('Got ' + subscriptions.length + ' subscriptions');
                        callback();
                    },
                    callback);
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
                Helpers.jsonRequest(
                    extend({
                        url: '/channels',
                        qs: {
                            part: 'contentDetails',
                            id: channelId
                        }
                    }, that._requestOptions),
                    function(result) {
                        var playlistId = result.items[0].contentDetails.relatedPlaylists.uploads;
                        subscriptions[index].playlistId = playlistId;
                        callback();
                    },
                    callback);
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
                Helpers.jsonRequest(
                    extend({
                        url: '/playlistItems',
                        qs: {
                            part: 'id,contentDetails,snippet',
                            playlistId: subscription.playlistId,
                            maxResults: 5
                        }
                    }, that._requestOptions),
                    function(result) {
                        subscriptions[index].videos = result.items;
                        callback();
                    },
                    callback);
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
            async.eachLimit(videos, 10, function(video, callback) {
                Items.Google.YouTube.Video.factory(video, function(item) {
                    parsed.push(item);
                    callback();
                });
            }, function(err) {
                callback(err, parsed);
            });
        },

        // Clean up any old uploaded media.
        function(items, callback) {
            items.sort(function(a, b) {
                return b.date - a.date;
            });
            Items.Google.YouTube.Video.deleteMediaBefore(items[items.length - 1].date, function(err) {
                callback(err, items);
            });
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Subscriptions;
