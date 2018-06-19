'use strict';

/*
Converts media from a Soundcloud playlist into items.
input: none
output: none
*/
ns('Washers.SoundCloud', global);
Washers.SoundCloud.Playlist = function(config, job) {
    Washers.SoundCloud.call(this, config, job);

    this.name = 'SoundCloud/Playlist';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent sounds from a SoundCloud playlist.',
        prompts: [{
                name: 'playlistUrl',
                message: 'Paste the link to the SoundCloud playlist'
            },
            Washer.downloadMediaOption()
        ]
    });
};

Washers.SoundCloud.Playlist.prototype = Object.create(Washers.SoundCloud.prototype);
Washers.SoundCloud.Playlist.className = Helpers.buildClassName(__filename);

Washers.SoundCloud.Playlist.prototype.doInput = function(callback) {
    var that = this;
    async.waterfall([

            // Get the playlist
            function(callback) {
                Helpers.jsonRequest(
                    that.job.log,
                    extend({
                        uri: '/resolve',
                        qs: {
                            client_id: that.clientId,
                            url: that.playlistUrl
                        }
                    }, that._requestOptions),
                    function(response) {
                        callback(null, response.tracks);
                    }, callback);
            },

            // Sort the tracks and return the most recent.
            function(tracks, callback) {
                tracks.sort(function(a, b) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                tracks = tracks.slice(0, 20);
                Item.download(Items.SoundCloud.Track, that, tracks, callback);
            }
        ],
        function(err, result) {
            callback(err, result);
        });
};

module.exports = Washers.SoundCloud.Playlist;
