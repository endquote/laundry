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

Items.Tumblr.Post.prototype = Object.create(global.Item.prototype);

// Convert a post from the API into a media item.
Items.Tumblr.Post.factory = function(post) {
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
                item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', photo.original_size.url, photo.original_size.width, photo.original_size.height);
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
        var biggest = post.player.sort(function(a, b) {
            return a.width - b.width;
        }).pop();
        item.description += biggest.embed_code;


    } else if (item.postType === 'audio') {
        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), titleLength));
        }

        item.description = post.caption;
        item.description += post.player;


    } else if (item.postType === 'photo') {
        if (post.caption) {
            item.title += util.format(': %s', Helpers.shortenString(S(post.caption).stripTags(), titleLength));
            item.description += post.caption;
        }
        post.photos.forEach(function(photo) {
            item.description += util.format('<p><img src="%s" width="%d" height="%d" /></p>', photo.original_size.url, photo.original_size.width, photo.original_size.height);
            item.description += photo.caption;
        });
    } else if (item.postType === 'chat') {

    }

    return item;
};

module.exports = Items.Tumblr.Post;