'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.SoundCloud', global);
Items.SoundCloud.Track = function(config) {
    this.artwork = null;
    Item.call(this, config);
};

Items.SoundCloud.Track.prototype = Object.create(Item.prototype);

// Convert a media object from the API into a media item.
Items.SoundCloud.Track.factory = function(track, clientId, callback) {

    // Upload the thumbnail
    var artworkTarget = 'Items/SoundCloud/Track/Artwork/' + track.id + '.jpg';
    Helpers.uploadUrl(track.artwork_url, false, artworkTarget, function(artworkUrl) {

        // Upload the video
        var mediaTarget = 'Items/SoundCloud/Track/' + track.id + '.' + (track.downloadable ? track.original_format : 'mp3');
        Helpers.uploadUrl(track.permalink_url, true, mediaTarget, function(audioUrl) {

            // tag_list is all like: yous truly r "ritual union" little dragon man live sweden gothenburg
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
            if (artworkUrl) {
                description += util.format('<p><img src="%s" /></p>', artworkUrl);
            }

            if (audioUrl) {
                description += util.format('<p><audio controls preload="none" src="%s" /></p>', audioUrl);
            }

            if (track.description) {
                description += util.format('<p>%s</p>', Autolinker.link(track.description));
            }

            if (audioUrl) {
                description += util.format('<p>(<a href="%s">download</a>)</p>', audioUrl);
            }

            var item = new Items.SoundCloud.Track({
                title: util.format('%s - %s', track.user.username, track.title),
                description: description,
                url: track.permalink_url,
                date: moment(new Date(track.created_at)),
                author: track.user.username,
                tags: tags,
                mediaUrl: audioUrl,
                artwork: artworkUrl
            });

            callback(item);
        });
    });
};

module.exports = Items.SoundCloud.Track;
