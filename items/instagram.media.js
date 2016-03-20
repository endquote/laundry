'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.Instagram', global);
Items.Instagram.Media = function(config) {
    this.type = '';
    this.image = '';
    this.caption = '';
    this.authorpic = '';
    this.comments = {
        count: 0,
        data: []
    };
    this.likes = {
        count: 0,
        data: []
    };
    this.location = {
        latitude: 0,
        name: '',
        longitude: 0,
        id: 0
    };

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Instagram.Media.prototype = Object.create(Item.prototype);
Items.Instagram.Media.className = Helpers.buildClassName(__filename);

Items.Instagram.Media.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        image: function(callback) {
            var target = prefix + '/' + obj.id + '.jpg';
            Storage.downloadUrl(washer.job.log, obj.images.standard_resolution.url, target, moment.unix(obj.created_time).toDate(), cache, false, download, callback);
        },
        video: function(callback) {
            var target = prefix + '/' + obj.id + '.mp4';
            Storage.downloadUrl(washer.job.log, obj.videos ? obj.videos.standard_resolution.url : null, target, moment.unix(obj.created_time).toDate(), cache, false, download, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Instagram.Media.factory = function(post, downloads) {
    var item = new Items.Instagram.Media({
        tags: post.tags,
        type: post.type,
        comments: post.comments,
        date: moment.unix(post.created_time),
        url: post.link,
        likes: post.likes,
        image: downloads.image.newUrl,
        video: downloads.video.newUrl,
        caption: post.caption ? post.caption.text : null,
        author: post.user.username,
        authorpic: post.user.profile_picture,
        location: post.location,
        mediaUrl: downloads.video.newUrl,
        mediaBytes: downloads.video.bytes
    });

    item.title = item.author;
    if (item.caption) {
        item.title += ': ' + Helpers.shortenString(item.caption, 30);
    }

    if (!item.video) {
        item.description = util.format('<p><a href="%s"><img src="%s" width="640" height="640"/></a></p>', item.url, item.image);
    } else {
        item.description = Item.buildVideo(item.video, item.image, 600, 600);
    }

    if (item.caption) {
        item.description += util.format('<p>%s</p>', Items.Instagram.Media.linkify(item.caption));
    }

    if (item.location) {
        item.description += util.format('<p><a href="http://maps.apple.com/?q=%s&ll=%s,%s">%s</a></p>',
            encodeURIComponent(item.location.name), item.location.latitude, item.location.longitude, item.location.name);
    }

    if (item.likes.data.length) {
        item.description += util.format('<p>%d likes: ', item.likes.count);
        item.likes.data.forEach(function(like, index, list) {
            item.description += util.format('<a href="http://instagram.com/%s">%s</a>', like.username, like.username);
            if (index < list.length - 1) {
                item.description += ', ';
            }
        });
        item.description += '</p>';
    }

    if (item.comments.data.length) {
        item.description += util.format('<p>%d comments:</p>', item.comments.count);
        item.comments.data.forEach(function(comment) {
            item.description += util.format('<p><strong><a href="http://instagram.com/%s">%s</a>:</strong> %s</p>',
                comment.from.username, comment.from.username, Items.Instagram.Media.linkify(comment.text));
        });
    }

    return item;
};

// Link usernames, tags, and urls.
Items.Instagram.Media.linkify = function(str) {
    var re = /@([\w.]+)/g; // Usernames can be letters, numbers, underscores, and periods.
    var match;
    var copy = str;
    while (match = re.exec(str)) { // jshint ignore:line
        var user = match[0].substr(1);
        // If the username is followed by a period, the period isn't part of the username.
        if (user.lastIndexOf('.') === user.length - 1) {
            user = user.substr(0, user.length - 1);
        }
        copy = copy.replace('@' + user, '<a href="https://instagram.com/' + user + '">@' + user + '</a>');
    }
    str = copy;

    str = str.replace(/#([\w]+)/g, '<a href="https://instagram.com/explore/tags/$1/">#$1</a>');
    str = Autolinker.link(str);
    return str;
};

module.exports = Items.Instagram.Media;
