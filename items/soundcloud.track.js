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

// An object passed to async.parallel() which handles downloading of files.
Items.SoundCloud.Track.downloadLogic = function(prefix, obj, oldKeys, newKeys, params) {
    return {
        artwork: function(callback) {
            var target = prefix + '/' + obj.id + '.jpg';
            newKeys.push(target);
            Helpers.uploadUrl(obj.artwork_url, target, oldKeys, false, callback);
        },
        audio: function(callback) {
            var target = prefix + '/' + obj.id + '.mp3';
            newKeys.push(target);
            var audioSource = util.format('%s?client_id=%s', obj.stream_url, params.clientId);
            Helpers.uploadUrl(audioSource, target, oldKeys, false, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.SoundCloud.Track.factory = function(obj, downloads) {
    // Tag list: yous truly r "ritual union" little dragon man live sweden gothenburg
    var tags = [];
    var quoted = obj.tag_list.match(/"[^"]+"/g);
    if (quoted) {
        quoted.forEach(function(tag) {
            obj.tag_list = obj.tag_list.replace(tag, '');
            tags.push(tag.replace(/"/g, ''));
        });
        obj.tag_list = obj.tag_list.replace('  ', ' ');
    }

    tags = tags.concat(obj.tag_list.split(' '));

    var description = '';
    if (downloads.artwork.newUrl) {
        description += util.format('<p><img src="%s" /></p>', downloads.artwork.newUrl);
    }

    if (downloads.audio.newUrl) {
        description += Item.buildAudio(downloads.audio.newUrl);
    }

    if (obj.description) {
        description += util.format('<p>%s</p>', Autolinker.link(obj.description));
    }

    if (downloads.audio.newUrl) {
        description += util.format('<p>(<a href="%s">download</a>)</p>', obj.download_url ? obj.download_url : downloads.audio.newUrl);
    }

    var item = new Items.SoundCloud.Track({
        title: util.format('%s - %s', obj.user.username, obj.title),
        description: description,
        url: obj.permalink_url,
        date: moment(new Date(obj.created_at)),
        author: obj.user.username,
        tags: tags,
        mediaUrl: downloads.audio.newUrl,
        artwork: downloads.artwork.newUrl
    });

    return item;
};

module.exports = Items.SoundCloud.Track;
