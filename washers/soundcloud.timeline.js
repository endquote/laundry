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

    this.input = _.merge(this.input, {
        description: 'Loads recent sounds from your SoundCloud timeline.'
    });
};

Washers.SoundCloud.Timeline.prototype = Object.create(Washers.SoundCloud.prototype);

Washers.SoundCloud.Timeline.prototype.doInput = function(callback) {
    var that = this;
    async.waterfall([

            // Get my userid
            function(callback) {
                Helpers.jsonRequest(
                    extend({
                        uri: '/me'
                    }, that._requestOptions), function(response) {
                        callback(null, response.id);
                    }, callback);
            },

            // Paged request to get all the people I'm following
            function(userid, callback) {
                var limit = 200;
                var following = [];
                var pageLength = 0;
                async.doWhilst(function(callback) {
                        Helpers.jsonRequest(
                            extend({
                                uri: util.format('/users/%d/followings', userid),
                                qs: {
                                    limit: limit,
                                    offset: following.length
                                }
                            }, that._requestOptions),
                            function(response) {
                                pageLength = response.length;
                                following = following.concat(response);
                                callback();
                            },
                            callback);
                    },
                    function() {
                        return pageLength === limit;
                    },
                    function(err) {
                        callback(err, following);
                    });
            },

            // For each person I'm following, get their recent tracks.
            function(following, callback) {
                var tracks = [];
                async.eachLimit(following, 10, function(following, callback) {
                        Helpers.jsonRequest(
                            extend({
                                uri: util.format('/users/%d/tracks', following.id)
                            }, that._requestOptions),
                            function(response) {
                                tracks = tracks.concat(response);
                                callback(null, response);
                            },
                            callback);
                    },
                    function(err) {
                        callback(err, tracks);
                    });
            },

            // Sort the tracks together and return the most recent.
            function(tracks, callback) {
                tracks.sort(function(a, b) {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                tracks = tracks.slice(0, 20);
                callback(null, tracks);
            },

            // Parse the tracks into Item objects.
            function(tracks, callback) {
                var parsed = [];
                async.eachLimit(tracks, 10, function(track, callback) {
                    Items.SoundCloud.Track.factory(track, that.clientId, function(item) {
                        parsed.push(item);
                        callback();
                    });
                }, function(err) {
                    callback(err, parsed);
                });
            }
        ],
        function(err, result) {
            callback(err, result);
        });
};

module.exports = Washers.SoundCloud.Timeline;
