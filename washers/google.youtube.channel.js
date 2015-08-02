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
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from a YouTube channel.',
        settings: [{
            name: 'channelName',
            prompt: 'What is the name of the channel to watch?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Google.YouTube.Channel.prototype = Object.create(Washers.Google.YouTube.prototype);

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
            log.debug('Getting playlist for channel ' + that.channelName);
            Helpers.jsonRequest(
                extend({
                    url: '/channels',
                    qs: {
                        part: 'contentDetails',
                        forUsername: that.channelName
                    }
                }, that._requestOptions),
                function(result) {
                    var playlistId = result.items[0].contentDetails.relatedPlaylists.uploads;
                    callback(null, playlistId);
                },
                callback);
        },

        // Get the playlist
        function(playlistId, callback) {
            // https://developers.google.com/youtube/v3/docs/playlistItems/list
            log.debug('Getting videos for playlist ' + playlistId);
            Helpers.jsonRequest(
                extend({
                    url: '/playlistItems',
                    qs: {
                        part: 'id,contentDetails,snippet',
                        playlistId: playlistId,
                        maxResults: 10
                    }
                }, that._requestOptions),
                function(result) {
                    callback(null, result.items);
                },
                callback);
        },

        // Parse the video objects into output objects.
        function(videos, callback) {
            var parsed = [];
            async.eachLimit(videos, 10, function(video, callback) {
                Items.Google.YouTube.Video.factory(that._job.name, video, function(item) {
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
            callback(items);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Channel;
