'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.SoundCloud', global);
Items.SoundCloud.Track = function(config) {
    this.stream = null;
    this.download = null;

    Item.call(this, config);
};

Items.SoundCloud.Track.prototype = Object.create(Item.prototype);

// Convert a media object from the API into a media item.
Items.SoundCloud.Track.factory = function(track, clientId) {

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

    var item = new Items.SoundCloud.Track({
        title: util.format('%s - %s', track.user.username, track.title),
        description: util.format('<p>%s</p>', Autolinker.link(track.description)),
        url: track.permalink_url,
        date: moment(new Date(track.created_at)),
        author: track.user.username,
        tags: tags
    });

    if (track.streamable) {
        item.stream = util.format('%s?client_id=%s', track.stream_url, clientId);
    }

    if (track.downloadable) {
        item.download = util.format('%s?client_id=%s', track.download_url, clientId);
    }

    item.mediaFile = item.download ? item.download : item.stream;

    if (item.download || item.stream) {
        item.description += util.format('<p><audio controls><source src="%s" type="audio/mpeg"/></audio></p>', item.mediaFile);
    }

    return item;
};

module.exports = Items.SoundCloud.Track;