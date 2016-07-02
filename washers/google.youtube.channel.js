'use strict';

/*
Youtube Channel washer
input: converts videos from a YouTube channel into items
output: null
*/
ns('Washers.Google.YouTube', global);
Washers.Google.YouTube.Channel = function(config, job) {
    Washers.Google.YouTube.call(this, config, job);

    this.name = 'YouTube/Channel';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from a YouTube channel.',
        prompts: [{
                name: 'channelName',
                message: 'What is the name or ID of the channel to watch?'
            },
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 10)
        ]
    });
};

Washers.Google.YouTube.Channel.prototype = Object.create(Washers.Google.YouTube.prototype);
Washers.Google.YouTube.Channel.className = Helpers.buildClassName(__filename);

Washers.Google.YouTube.Channel.prototype.doInput = function(callback) {
    var that = this;

    async.waterfall([
        // Update access token
        function(callback) {
            that.refreshAccessToken(callback);
        },

        // Get the playlist id for the channel
        function(callback) {
            // https://developers.google.com/youtube/v3/docs/channels/list
            that.job.log.debug('Getting playlist for channel name ' + that.channelName);
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: '/channels',
                    qs: {
                        part: 'contentDetails',
                        forUsername: that.channelName
                    }
                }, that._requestOptions),
                function(result) {
                    if (!result.items.length) {
                        callback(null, 0);
                    } else {
                        var playlistId = result.items[0].contentDetails.relatedPlaylists.uploads;
                        callback(null, playlistId);
                    }
                },
                callback);
        },

        function(playlistId, callback) {

            if (playlistId) {
                // Got the default channel for the username, carry on...
                callback(null, playlistId);
                return;
            }

            // Get the playlist id from a channel id.
            // https://developers.google.com/youtube/v3/docs/channels/list
            that.job.log.debug('Getting playlist for channel ID ' + that.channelName);
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: '/channels',
                    qs: {
                        part: 'contentDetails',
                        id: that.channelName
                    }
                }, that._requestOptions),
                function(result) {
                    if (!result.items.length) {
                        callback('Channel not found.');
                    } else {
                        var playlistId = result.items[0].contentDetails.relatedPlaylists.uploads;
                        callback(null, playlistId);
                    }
                },
                callback);
        },

        // Get the playlist
        function(playlistId, callback) {
            // https://developers.google.com/youtube/v3/docs/playlistItems/list
            that.job.log.debug('Getting videos for playlist ' + playlistId);
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: '/playlistItems',
                    qs: {
                        part: 'id,contentDetails,snippet',
                        playlistId: playlistId,
                        maxResults: that.quantity
                    }
                }, that._requestOptions),
                function(result) {
                    callback(null, result.items);
                },
                callback);
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

        // Parse the video objects into output objects.
        function(videos, callback) {
            Item.download(Items.Google.YouTube.Video, that, videos, callback);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Channel;
