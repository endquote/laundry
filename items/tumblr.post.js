'use strict';

ns('Items.Tumblr', global);
Items.Tumblr.Post = function(config) {
    this.postType = null;
    this.reblogKey = null;
    this.sourceUrl = null;
    this.sourceTitle = null;
    this.liked = false;

    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Tumblr.Post.prototype = Object.create(Item.prototype);
Items.Tumblr.Post.className = Helpers.buildClassName(__filename);

// Given a collection of API responses, perform downloads and construct a item objects.
Items.Tumblr.Post.download = function(jobName, posts, callback) {
    var prefix = Item.buildPrefix(jobName, Items.Tumblr.Post.className);
    var items = [];
    var newKeys = [];
    var oldKeys = [];

    async.waterfall([

        // Cache existing keys so they're not uploaded again.
        function(callback) {
            Helpers.cacheObjects(prefix, function(err, c) {
                oldKeys = c;
                callback(err);
            });
        },
        function(callback) {

            // Process each post object.
            async.eachLimit(posts, 5, function(post, callback) {
                // Upload files.
                async.parallel({

                    // Try to extract a video -- this often fails on Tumblr.
                    video: function(callback) {
                        var target = prefix + '/' + post.id + '.mp4';
                        newKeys.push(target);
                        Helpers.uploadUrl(post.type === 'video' ? post.post_url : null, target, oldKeys, true, function(err, res) {

                            // If we did get a video, get the thumbnail too.
                            if (res && res.ytdl && res.ytdl.thumbnails && res.ytdl.thumbnails.length) {
                                var target = prefix + '/' + post.id + '-thumb.jpg';
                                newKeys.push(target);
                                Helpers.uploadUrl(res.ytdl.thumbnails[0].url, target, oldKeys, false, function() {
                                    callback(err, res);
                                });
                            } else {
                                callback(err, res);
                            }
                        });
                    },

                    audio: function(callback) {
                        var target = prefix + '/' + post.id + '.mp3';
                        newKeys.push(target);
                        Helpers.uploadUrl(post.type === 'audio' ? post.post_url : null, target, oldKeys, true, callback);
                    },

                    photos: function(callback) {
                        var results = [];
                        async.each(post.photos, function(photo, callback) {
                            var target = prefix + '/' + post.id;
                            if (post.photos.length > 1) {
                                target += '-' + (post.photos.indexOf(photo) + 1);
                            }
                            target += '.jpg';
                            newKeys.push(target);
                            // "protocol mismatch" error in follow-redirects if it's http
                            Helpers.uploadUrl(photo.original_size.url.replace('http:', 'https:'), target, oldKeys, false, function(err, res) {
                                results.push(res);
                                callback();
                            });
                        }, function(err) {
                            callback(err, results);
                        });
                    }
                }, function(err, uploads) {
                    if (err) {
                        // Carry on when an upload fails.
                        log.warn(err);
                        callback();
                        return;
                    }

                    items.push(Items.Tumblr.Post.factory(post, uploads));
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

// Construct an Item given an API response and any upload info.
Items.Tumblr.Post.factory = function(post, uploads) {
    var titleLength = 30;

    var item = new Items.Tumblr.Post({
        title: post.blog_name,
        url: post.post_url,
        date: moment(new Date(post.date)),
        author: post.blog_name,
        tags: post.tags
    });

    item.postType = post.type;
    item.reblogKey = post.reblog_key;
    item.sourceUrl = post.source_url;
    item.sourceTitle = post.source_title;
    item.liked = post.liked;

    // Use uploaded photos if any
    if (post.photos) {
        post.photos.forEach(function(photo, index) {
            photo.url = uploads && uploads.photos ? uploads.photos[index].newUrl : photo.original_size.url;
        });
    }

    if (item.postType === 'text') {
        item.title += util.format(': %s', Helpers.shortenString(S(item.title).stripTags(), titleLength));
        item.description = post.body;


    } else if (item.postType === 'quote') {
        if (post.source) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.source).stripTags(), titleLength));
        }

        item.description = util.format('<p>"%s"</p>', post.text);
        if (post.source.toLowerCase().indexOf('<p>') !== 0) {
            item.description += util.format('<p>%s</p>', post.source);
        } else {
            item.description += post.source;
        }


    } else if (item.postType === 'link') {
        if (post.title) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.title).stripTags(), titleLength));
        }
        item.description = util.format('<p><a href="%s">%s</a></p>', post.url, post.title);
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
        if (post.photos) {
            post.photos.forEach(function(photo) {
                item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', photo.url, photo.original_size.width, photo.original_size.height);
                item.description += photo.caption;
            });
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

        item.description = post.caption;

        if (uploads.video) {
            item.description += Item.buildVideo(uploads.video.newUrl, uploads.video.newUrl.replace('.mp4', '-thumb.jpg'));
            item.mediaUrl = uploads.video.newUrl;
        } else {
            var biggest = post.player.sort(function(a, b) {
                return a.width - b.width;
            }).pop();
            item.description += biggest.embed_code;
        }


    } else if (item.postType === 'audio') {
        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), titleLength));
        }

        item.description = post.caption;

        if (uploads.audio) {
            item.description += Item.buildAudio(uploads.audio.newUrl);
            item.mediaUrl = uploads.audio.newUrl;
        } else {
            item.description += post.player;
        }


    } else if (item.postType === 'photo') {
        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), titleLength));
            item.description += post.caption;
        }
        post.photos.forEach(function(photo, index) {
            item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', photo.url, photo.original_size.width, photo.original_size.height);
            item.description += photo.caption;
        });
    } else if (item.postType === 'chat') {

    }

    return item;
};

module.exports = Items.Tumblr.Post;
