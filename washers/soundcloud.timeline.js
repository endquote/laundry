'use strict';

/*
Converts media from the user's SoundCloud timeline into items.
input: none
output: none
*/
ns('Washers.SoundCloud', global);
Washers.SoundCloud.Timeline = function(config, job) {
    Washers.SoundCloud.call(this, config, job);

    this.name = 'SoundCloud/Timeline';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent sounds from your SoundCloud timeline.',
        prompts: [{
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

Washers.SoundCloud.Timeline.prototype = Object.create(Washers.SoundCloud.prototype);
Washers.SoundCloud.Timeline.className = Helpers.buildClassName(__filename);

Washers.SoundCloud.Timeline.prototype.doInput = function(callback) {
    var that = this;
    async.waterfall([

        // Get my userid
        function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    uri: '/me'
                }, that._requestOptions),
                function(response) {
                    callback(null, response.id);
                }, callback);
        },

        // Paged request to get all the people I'm following
        function(userid, callback) {
            var limit = 200;
            var following = [];
            var endpoint = extend({
                uri: util.format('/users/%d/followings', userid),
                qs: {
                    limit: limit
                }
            }, that._requestOptions);

            async.doWhilst(function(callback) {
                Helpers.jsonRequest(
                    that.job.log,
                    endpoint,
                    function(response) {
                        endpoint = {
                            uri: response.next_href
                        };
                        following = following.concat(response.collection);
                        callback();
                    },
                    callback);
            }, function() {
                return endpoint.uri;
            }, function(err) {
                callback(err, following);
            });
        },

        // For each person I'm following, get their recent tracks.
        function(following, callback) {
            var tracks = [];
            async.eachLimit(following, 10, function(following, callback) {
                Helpers.jsonRequest(
                    that.job.log,
                    extend({
                        uri: util.format('/users/%d/tracks', following.id)
                    }, that._requestOptions),
                    function(response) {
                        tracks = tracks.concat(response);
                        callback(null, response);
                    },
                    callback);
            }, function(err) {
                callback(err, tracks);
            });
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
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.SoundCloud.Timeline;
