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
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from your YouTube subscriptions.',
        prompts: [
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 50)
        ]
    });
};

Washers.Google.YouTube.Subscriptions.prototype = Object.create(Washers.Google.YouTube.prototype);
Washers.Google.YouTube.Subscriptions.className = Helpers.buildClassName(__filename);

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
                    that.job.log,
                    extend({
                        url: '/subscriptions',
                        qs: {
                            part: 'id,snippet',
                            mine: true,
                            auth: that._oauth2Client,
                            maxResults: that.quantity,
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

                        that.job.log.debug('Got ' + subscriptions.length + ' subscriptions');
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
                that.job.log.debug('Getting playlist for channel ' + channelId);
                Helpers.jsonRequest(
                    that.job.log,
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
                that.job.log.debug('Getting videos for playlist ' + subscription.playlistId);
                Helpers.jsonRequest(
                    that.job.log,
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
            var videos = [];
            subscriptions.forEach(function(subscription, index, array) {
                videos = videos.concat(subscription.videos);
            });

            that.job.log.debug('Reducing ' + videos.length + ' videos to ' + that.quantity);

            videos.sort(function(a, b) {
                return new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime();
            });

            videos = videos.slice(0, that.quantity);
            callback(null, videos);
        },

        function(videos, callback) {
            var ids = videos.map(function(video) {
                return video.contentDetails.videoId;
            });

            // https://developers.google.com/youtube/v3/docs/videos/list
            that.job.log.debug('Getting video durations.');
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: '/videos',
                    qs: {
                        id: ids.join(','),
                        part: 'id,contentDetails'
                    }
                }, that._requestOptions),
                function(result) {

                    // For each duration, find the matching video and set the duration property.
                    result.items.forEach(function(details) {
                        var video = videos.filter(function(video) {
                            return video.contentDetails.videoId === details.id;
                        })[0];
                        video.duration = moment.duration(details.contentDetails.duration).asSeconds();
                    });
                    callback(null, videos);
                },
                callback);
        },

        function(videos, callback) {
            Item.download(Items.Google.YouTube.Video, that, videos, callback);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Subscriptions;
