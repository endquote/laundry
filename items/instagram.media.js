'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.Instagram', global);
Items.Instagram.Media = function(config) {
    this.id = '';
    this.type = '';
    this.images = [];
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
            var media = obj.carousel_media || [obj];
            var imgs = media.filter(i => i.media_type !== 2);
            async.each(imgs, function(img, callback) {
                var target = prefix + '/' + img.id + '.jpg';
                Storage.downloadUrl(washer.job.log, img.image_versions2.candidates[0].url, target, moment.unix(obj.taken_at).toDate(), cache, false, download, function(err, res) {
                    res.index = media.indexOf(img);
                    results.push(res);
                    callback();
                });
            }, function(err) {
                callback(err, results);
            });
        },
        videos: function(callback) {
            var results = [];
            var media = obj.carousel_media || [obj];
            var videos = media.filter(i => i.media_type === 2);
            async.each(videos, function(video, callback) {
                var target = prefix + '/' + video.id + '.mp4';
                Storage.downloadUrl(washer.job.log, video.video_versions[0].url, target, moment.unix(obj.taken_at).toDate(), cache, false, download, function(err, res) {
                    res.index = media.indexOf(video);
                    res.width = video.video_versions[0].width;
                    res.height = video.video_versions[0].height;
                    results.push(res);
                    target = target.replace('.mp4', '.jpg');
                    Storage.downloadUrl(washer.job.log, video.image_versions2.candidates[0].url, target, moment.unix(obj.taken_at).toDate(), cache, false, download, function(err, poster) {
                        res.poster = poster;
                        callback();
                    });
                });
            }, function(err) {
                callback(err, results);
            });
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
            data: post.top_likers
        },
        comments: {
            count: post.comment_count,
            data: post.preview_comments
        },
        images: downloads.images,
        imageUrl: downloads.images.length ? downloads.images[0].newUrl : '',
        videos: downloads.videos,
        caption: post.caption ? post.caption.text : null,
        author: post.user.username,
        authorpic: post.user.profile_pic_url,
        location: post.location,
        mediaUrl: downloads.videos.length ? downloads.videos[0].newUrl : '',
        mediaBytes: downloads.videos.length ? downloads.videos[0].bytes : 0,
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
        item.title += ': ' + Helpers.shortenString(item.caption.replace(/[\r\n]/g, ' '), 30);
    }

    item.description = '';

    var media = item.images.concat(item.videos).sort((a, b) => a.index - b.index);
    var autoplay = media.length === 1;
    media.forEach(function(m) {
        if (item.images.indexOf(m) !== -1) {
            item.description += util.format('<p><a href="%s"><img src="%s"/></a></p>', item.url, m.newUrl);
        } else if (item.videos.indexOf(m) !== -1) {
            item.description += Item.buildVideo(m.newUrl, m.poster.newUrl,
                m.width, m.height, autoplay, autoplay);
        }
    });

    if (item.caption) {
        item.caption = item.caption.replace(/[\r\n]/g, '<br>');
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
            item.description += util.format('<a href="http://instagram.com/%s">%s</a>', like, like);
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

    // item.description += util.format('<p>(<a href="instagram://media?id=%s">open in app</a>)</p>', item.id);

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
