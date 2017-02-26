'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.Instagram', global);
Items.Instagram.Media = function(config) {
    this.id = '';
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
        city: '',
        name: '',
        address: '',
        lat: 0,
        lng: 0
    };

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Instagram.Media.prototype = Object.create(Item.prototype);
Items.Instagram.Media.className = Helpers.buildClassName(__filename);

Items.Instagram.Media.downloadLogic = function(prefix, obj, washer, cache, download) {
    return {
        images: function(callback) {
            var results = [];
            var imgs = obj.carousel_media || [obj];
            async.each(imgs, function(img, callback) {
                var target = prefix + '/' + img.id + '.jpg';
                Storage.downloadUrl(washer.job.log, img.image_versions2.candidates[0].url, target, moment.unix(obj.taken_at).toDate(), cache, false, download, function(err, res) {
                    results.push(res);
                    callback();
                });
            }, function(err) {
                callback(err, results);
            });
        },
        video: function(callback) {
            var target = prefix + '/' + obj.id + '.mp4';
            Storage.downloadUrl(washer.job.log, obj.video_versions ? obj.video_versions[0].url : null, target, moment.unix(obj.taken_at).toDate(), cache, false, download, callback);
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Instagram.Media.factory = function(post, downloads) {
    var item = new Items.Instagram.Media({
        id: post.id,
        type: post.video_versions ? 'video' : 'still',
        date: moment.unix(post.taken_at),
        url: util.format('https://www.instagram.com/p/%s/', post.code),
        likes: {
            count: post.like_count,
            data: post.likers
        },
        comments: {
            count: post.comment_count,
            data: post.comments
        },
        images: downloads.images,
        video: downloads.video.newUrl,
        caption: post.caption ? post.caption.text : null,
        author: post.user.username,
        authorpic: post.user.profile_pic_url,
        location: post.location,
        mediaUrl: downloads.video.newUrl,
        mediaBytes: downloads.video.bytes,
        downloads: downloads
    });

    item.tags = [];
    if (item.caption) {
        var re = /#([\w]+)/g;
        var match;
        while (match = re.exec(post.caption.text)) { // jshint ignore:line
            item.tags.push(match[0].substr(1));
        }
    }

    item.title = item.author;
    if (item.caption) {
        item.title += ': ' + Helpers.shortenString(item.caption, 30);
    }

    if (!item.video) {
        item.description = '';
        item.images.forEach(function(i) {
            item.description += util.format('<p><a href="%s"><img src="%s"/></a></p>', item.url, i.newUrl);
        });
    } else {
        item.description = Item.buildVideo(item.video, item.image, 600, 600);
    }

    if (item.caption) {
        item.description += util.format('<p>%s</p>', Items.Instagram.Media.linkify(item.caption));
    }

    if (item.location) {
        var label = '';
        if (item.location.name && item.location.city) {
            label = item.location.name + ', ' + item.location.city;
        } else if (item.location.name || item.location.city) {
            label = item.location.name || item.location.city;
        }
        item.description += util.format('<p><a href="http://maps.apple.com/?q=%s&ll=%s,%s">%s</a></p>',
            encodeURIComponent(item.location.name), item.location.lat, item.location.lng, label);
    }

    if (item.likes.count) {
        item.description += util.format('<p>%d likes', item.likes.count);
    }

    if (item.likes.data && item.likes.data.length) {
        item.description += ': ';
        item.likes.data.forEach(function(like, index, list) {
            item.description += util.format('<a href="http://instagram.com/%s">%s</a>', like.username, like.username);
            if (index < list.length - 1) {
                item.description += ', ';
            }
        });
        item.description += '</p>';
    }

    if (item.comments.count) {
        item.description += util.format('<p>%d comments</p>', item.comments.count);
    }

    if (item.comments.data && item.comments.data.length) {
        item.comments.data.forEach(function(comment) {
            item.description += util.format('<p><strong><a href="http://instagram.com/%s">%s</a>:</strong> %s</p>',
                comment.user.username, comment.user.username, Items.Instagram.Media.linkify(comment.text));
        });
    }

    item.description += util.format('<p>(<a href="instagram://media?id=%s">open in app</a>)</p>', item.id);

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
