'use strict';

ns('Items.Tumblr', global);
Items.Tumblr.Post = function(config) {
    this.postType = null;
    this.reblogKey = null;
    this.sourceUrl = null;
    this.sourceTitle = null;
    this.liked = null;

    Item.call(this, config);
};

Items.Tumblr.Post.prototype = _.create(global.Item.prototype);

// Convert a post from the API into a media item.
Items.Tumblr.Post.factory = function(post) {
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

    if (item.postType === 'text') {
        if (item.title) {
            item.title += util.format(': %s', Helpers.shortenString(S(item.title).stripTags(), 30));
        }
        item.description = item.body;
    } else if (item.postType === 'quote') {

    } else if (item.postType === 'link') {

    } else if (item.postType === 'answer') {

    } else if (item.postType === 'video') {

    } else if (item.postType === 'audio') {

    } else if (item.postType === 'photo') {
        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), 30));
            item.description += post.caption;
        }
        post.photos.forEach(function(photo) {
            var biggest = photo.alt_sizes.sort(function(a, b) {
                return a.width - b.width;
            }).pop();
            item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', biggest.url, biggest.width, biggest.height);
            item.description += photo.caption;
        });
    } else if (item.postType === 'chat') {

    }

    return item;
};

module.exports = Items.Tumblr.Post;