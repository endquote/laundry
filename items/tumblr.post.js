'use strict';

ns('Items.Tumblr', global);
Items.Tumblr.Post = function(config) {
    this.postType = '';
    this.reblogKey = '';
    this.sourceUrl = '';
    this.sourceTitle = '';
    this.liked = false;
    this.caption = '';

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Tumblr.Post.prototype = Object.create(Item.prototype);
Items.Tumblr.Post.className = Helpers.buildClassName(__filename);

Items.Tumblr.Post.downloadLogic = function(prefix, obj, washer, cache, download) {
    var targetDate = new Date(obj.date);
    return {
        // Try to extract a video -- this often fails on Tumblr.
        video: function(callback) {
            var target = prefix + '/' + obj.id + '.mp4';
            Storage.downloadUrl(washer.job.log, obj.type === 'video' ? obj.post_url : null, target, targetDate, cache, true, download, function(err, res) {

                // If we did get a video, get the thumbnail too.
                if (obj.type === 'video' && res.oldUrl !== res.newUrl) {
                    var url = res.ytdl && res.ytdl.thumbnails && res.ytdl.thumbnails.length ? res.ytdl.thumbnails[0].url : null;
                    var target = prefix + '/' + obj.id + '-thumb.jpg';
                    Storage.downloadUrl(washer.job.log, url, target, targetDate, cache, false, download, function(thumbErr, thumbRes) {
                        res.thumbnail = thumbRes;
                        callback(err, res);
                    });
                } else {
                    callback(err, res);
                }
            });
        },

        audio: function(callback) {
            var target = prefix + '/' + obj.id + '.mp3';
            Storage.downloadUrl(washer.job.log, obj.type === 'audio' ? obj.post_url : null, target, targetDate, cache, true, download, callback);
        },

        photos: function(callback) {
            var results = [];
            async.each(obj.photos, function(photo, callback) {
                var target = prefix + '/' + obj.id;
                if (obj.photos.length > 1) {
                    target += '-' + (obj.photos.indexOf(photo) + 1);
                }
                target += '.jpg';

                Storage.downloadUrl(washer.job.log, photo.original_size.url, target, targetDate, cache, false, download, function(err, res) {
                    results.push(res);
                    callback();
                });
            }, function(err) {
                callback(err, results);
            });
        }
    };
};

// Construct an Item given an API response and any upload info.
Items.Tumblr.Post.factory = function(post, downloads) {
    var titleLength = 30;

    var item = new Items.Tumblr.Post({
        title: post.blog_name,
        url: post.post_url,
        date: moment(new Date(post.date)),
        author: post.blog_name,
        tags: post.tags,
        caption: post.caption ? S(post.caption).stripTags().s : ''
    });

    item.postType = post.type;
    item.reblogKey = post.reblog_key;
    item.sourceUrl = post.source_url;
    item.sourceTitle = post.source_title;
    item.liked = post.liked;
    item.description = '';
    item.downloads = downloads;

    // Use uploaded photos if any
    if (post.photos) {
        post.photos.forEach(function(photo, index) {
            photo.url = downloads && downloads.photos ? downloads.photos[index].newUrl : photo.original_size.url;
        });
    }

    if (item.postType === 'text') {
        if (post.title) {
            item.title += util.format(': %s', S(post.title).stripTags());
        }
        item.description += post.body;


    } else if (item.postType === 'quote') {
        if (post.source) {
            item.title += util.format(': %s', S(post.source).stripTags());
        }

        item.description += util.format('<p>"%s"</p>', post.text);
        if (post.source.toLowerCase().indexOf('<p>') !== 0) {
            item.description += util.format('<p>%s</p>', post.source);
        } else {
            item.description += post.source;
        }


    } else if (item.postType === 'link') {
        if (post.title) {
            item.title += util.format(': %s', S(post.title).stripTags());
        }
        if (post.photos) {
            post.photos.forEach(function(photo) {
                item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', photo.url, photo.original_size.width, photo.original_size.height);
                item.description += photo.caption;
            });
        }
        item.description += util.format('<p><a href="%s">%s</a></p>', post.url, post.title);
        if (post.excerpt) {
            if (post.excerpt.toLowerCase().indexOf('<p>') !== 0) {
                item.description += util.format('<p>%s</p>', post.excerpt);
            } else {
                item.description += post.excerpt;
            }
        }
        if (post.publisher) {
            if (post.publisher.toLowerCase().indexOf('<p>') !== 0) {
                item.description += util.format('<p>%s</p>', post.publisher);
            } else {
                item.description += post.publisher;
            }
        }
        if (post.description) {
            if (post.description.toLowerCase().indexOf('<p>') !== 0) {
                item.description += util.format('<p>%s</p>', post.description);
            } else {
                item.description += post.description;
            }
        }


    } else if (item.postType === 'answer') {
        item.title += util.format(': %s', Helpers.shortenString(S(post.question).stripTags(), titleLength));
        var isAnon = post.asking_name.toLowerCase() === 'anonymous';
        item.description += util.format('<p>"%s" ', post.question);
        if (post.asking_name.toLowerCase() === 'anonymous') {
            item.description += '—anonymous';
        } else if (post.asking_url) {
            item.description += util.format('—<a href="%s">%s</a>', post.asking_url, post.asking_name);
        } else {
            item.description += util.format('—%s', post.asking_name);
        }
        item.description += '</p>';

        item.description += post.answer;


    } else if (item.postType === 'video') {
        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), titleLength));
        }

        if (downloads.video.oldUrl !== downloads.video.newUrl) {
            item.description += Item.buildVideo(downloads.video.newUrl, downloads.video.thumbnail ? downloads.video.thumbnail.newUrl : null, 1920, 1080);
            item.mediaUrl = downloads.video.newUrl;
            item.mediaBytes = downloads.video.bytes;
            item.imageUrl = downloads.video.thumbnail.newUrl;
        } else {
            var biggest = post.player.sort(function(a, b) {
                return a.width - b.width;
            }).pop();
            item.description += biggest.embed_code;
        }

        item.description += post.caption;


    } else if (item.postType === 'audio') {
        if (post.caption) {
            item.title += util.format(': %s', S(post.caption).stripTags());
        }

        if (downloads.audio.oldUrl !== downloads.audio.newUrl) {
            item.description += Item.buildAudio(downloads.audio.newUrl);
            item.mediaUrl = downloads.audio.newUrl;
            item.mediaBytes = downloads.audio.bytes;
        } else {
            item.description += post.player;
        }

        item.description += post.caption;


    } else if (item.postType === 'photo') {
        post.photos.forEach(function(photo, index) {
            item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', photo.url, photo.original_size.width, photo.original_size.height);
            item.description += photo.caption;
        });

        item.imageUrl = post.photos[0].url;

        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), titleLength));
            item.description += post.caption;
        }
    } else if (item.postType === 'chat') {

    }

    return item;
};

module.exports = Items.Tumblr.Post;
