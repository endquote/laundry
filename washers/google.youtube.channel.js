'use strict';

var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client
var youtube = google.youtube('v3'); // https://developers.google.com/youtube/v3/docs/

/*
Youtube Channel washer
input: converts videos from a YouTube channel into items
output: null
*/
ns('Washers.Google.YouTube', global);
Washers.Google.YouTube.Channel = function(config) {
    Washers.Google.YouTube.call(this, config);

    this.name = 'YouTube/Channel';
    this.classFile = path.basename(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent videos from a YouTube channel.',
        settings: [{
            name: 'channelName',
            prompt: 'What is the name of the channel to watch?',
            afterEntry: function(rl, oldValue, newValue, callback) {
                // TODO: Validate that channel is real?
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Google.YouTube.Channel.prototype = _.create(Washers.Google.YouTube.prototype);

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
            youtube.channels.list({
                part: 'contentDetails',
                auth: that._oauth2Client,
                forUsername: that.channelName
            }, function(err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                var playlistId = result.items[0].contentDetails.relatedPlaylists.uploads;
                callback(null, playlistId);
            });
        },

        // Get the playlist
        function(playlistId, callback) {
            // https://developers.google.com/youtube/v3/docs/playlistItems/list
            log.debug('Getting videos for playlist ' + playlistId);
            youtube.playlistItems.list({
                part: 'id,contentDetails,snippet',
                auth: that._oauth2Client,
                playlistId: playlistId,
                maxResults: 50
            }, function(err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, result.items);
            });
        },

        // Parse the video objects into output objects.
        function(videos, callback) {

            var parsed = [];
            videos.forEach(function(video, index, array) {
                parsed.push(that.parseItem(video));
            });

            callback(null, parsed);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.YouTube.Channel;