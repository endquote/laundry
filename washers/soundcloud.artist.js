'use strict';

/*
Converts media from a Soundcloud artist's feed into items.
input: none
output: none
*/
ns('Washers.SoundCloud', global);
Washers.SoundCloud.Artist = function(config, job) {
    Washers.SoundCloud.call(this, config, job);

    this.name = 'SoundCloud/Artist';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent sounds from a SoundCloud artist.',
        prompts: [{
                name: 'artistName',
                message: 'What is the name of the artist to follow?'
            }, {
                name: 'minDuration',
                message: 'Only get tracks longer than this many minutes (leave blank to include short tracks)',
                validate: function(value, answers) {
                    return !value || validator.isDecimal(value.toString());
                }
            }, {
                name: 'maxDuration',
                message: 'Only get tracks shorter than this many minutes (leave blank to include long tracks)',
                validate: function(value, answers) {
                    return !value || validator.isDecimal(value.toString());
                }
            },
            Washer.downloadMediaOption()
        ]
    });
};

Washers.SoundCloud.Artist.prototype = Object.create(Washers.SoundCloud.prototype);
Washers.SoundCloud.Artist.className = Helpers.buildClassName(__filename);

Washers.SoundCloud.Artist.prototype.doInput = function(callback) {
    var that = this;
    async.waterfall([

            // Get the userid
            function(callback) {
                Helpers.jsonRequest(
                    that.job.log,
                    extend({
                        uri: '/users',
                        qs: {
                            q: that.artistName
                        }
                    }, that._requestOptions),
                    function(response) {
                        var user = response.filter(function(u) {
                            return u.permalink.toLowerCase() === that.artistName.toLowerCase();
                        })[0];
                        if (!user) {
                            callback(util.format('User %s not found', that.artistName));
                        } else {
                            callback(null, user.id);
                        }
                    }, callback);
            },

            // Get the tracks.
            function(userId, callback) {
                Helpers.jsonRequest(
                    that.job.log,
                    extend({
                        uri: util.format('/users/%d/tracks', userId),
                        qs: {
                            client_id: that.clientId
                        }
                    }, that._requestOptions),
                    function(response) {
                        callback(null, response);
                    },
                    callback);
            },

            // Sort the tracks together and return the most recent.
            function(tracks, callback) {
                tracks.sort(function(a, b) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                if (that.minDuration) {
                    tracks = tracks.filter(function(track) {
                        return track.duration >= that.minDuration * 60 * 1000;
                    });
                }
                if (that.maxDuration) {
                    tracks = tracks.filter(function(track) {
                        return track.duration <= that.maxDuration * 60 * 1000;
                    });
                }
                tracks = tracks.slice(0, 20);
                Item.download(Items.SoundCloud.Track, that, tracks, callback);
            }
        ],
        function(err, result) {
            callback(err, result);
        });
};

module.exports = Washers.SoundCloud.Artist;
