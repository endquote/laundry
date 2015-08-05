'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.SoundCloud', global);
Items.SoundCloud.Track = function(config) {
    this.artwork = null;

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.SoundCloud.Track.prototype = Object.create(Item.prototype);
Items.SoundCloud.Track.className = Helpers.buildClassName(__filename);

// Convert a media object from the API into a media item.
Items.SoundCloud.Track.factory = function(jobName, tracks, clientId, callback) {
    var prefix = Item.buildPrefix(jobName, Items.SoundCloud.Track.className);
    var items = [];
    var newKeys = [];
    var oldKeys = [];
    async.waterfall([

        // Cache existing newKeys so they're not uploaded again.
        function(callback) {
            Helpers.cacheObjects(prefix, function(err, c) {
                oldKeys = c;
                callback(err);
            });
        },
        function(callback) {

            // Process each track object.
            async.eachLimit(tracks, 5, function(track, callback) {
                // Upload files.
                async.parallel({
                    artwork: function(callback) {
                        var artworkTarget = prefix + '/' + track.id + '.jpg';
                        newKeys.push(artworkTarget);
                        Helpers.uploadUrl(track.artwork_url, artworkTarget, oldKeys, false, callback);
                    },
                    audio: function(callback) {
                        var audioTarget = prefix + '/' + track.id + '.mp3';
                        newKeys.push(audioTarget);
                        var audioSource = util.format('%s?client_id=%s', track.stream_url, clientId);
                        Helpers.uploadUrl(audioSource, audioTarget, oldKeys, false, callback);
                    }
                }, function(err, uploads) {
                    if (err) {
                        // Carry on when an upload fails.
                        log.warn(err);
                        callback();
                        return;
                    }

                    // Tag list: yous truly r "ritual union" little dragon man live sweden gothenburg
                    var tags = [];
                    var quoted = track.tag_list.match(/"[^"]+"/g);
                    if (quoted) {
                        quoted.forEach(function(tag) {
                            track.tag_list = track.tag_list.replace(tag, '');
                            tags.push(tag.replace(/"/g, ''));
                        });
                        track.tag_list = track.tag_list.replace('  ', ' ');
                    }

                    tags = tags.concat(track.tag_list.split(' '));

                    var description = '';
                    if (uploads.artwork.newUrl) {
                        description += util.format('<p><img src="%s" /></p>', uploads.artwork.newUrl);
                    }

                    if (uploads.audio.newUrl) {
                        description += Item.buildAudio(uploads.audio.newUrl);
                    }

                    if (track.description) {
                        description += util.format('<p>%s</p>', Autolinker.link(track.description));
                    }

                    if (uploads.audio.newUrl) {
                        description += util.format('<p>(<a href="%s">download</a>)</p>', track.download_url ? track.download_url : uploads.audio.newUrl);
                    }

                    var item = new Items.SoundCloud.Track({
                        title: util.format('%s - %s', track.user.username, track.title),
                        description: description,
                        url: track.permalink_url,
                        date: moment(new Date(track.created_at)),
                        author: track.user.username,
                        tags: tags,
                        mediaUrl: uploads.audio.newUrl,
                        artwork: uploads.artwork.newUrl
                    });

                    items.push(item);
                    callback();
                });
            }, callback);
        },

        // Delete any old stuff in the cache.
        function(callback) {
            Helpers.deleteExpired(newKeys, oldKeys, callback);
        }
    ], function(err) {
        // Return all the constructed items.
        callback(err, items);
    });
};

module.exports = Items.SoundCloud.Track;
