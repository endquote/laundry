'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes an Instagram object
ns('Items.Instagram', global);
Items.Instagram.Media = function(config) {
    this.type = null;
    this.comments = null;
    this.likes = 0;
    this.image = null;
    this.caption = null;
    this.authorpic = null;

    Item.call(this, config);
};

Items.Instagram.Media.prototype = _.create(global.Item.prototype);

// Convert a media object from the API into a media item.
Items.Instagram.Media.factory = function(media) {

    var item = new Items.Instagram.Media({
        tags: media.tags,
        type: media.type,
        comments: media.comments,
        date: moment.unix(media.created_time),
        url: media.link,
        likes: media.likes,
        image: media.images.standard_resolution.url,
        video: media.videos ? media.videos.standard_resolution.url : null,
        caption: media.caption ? media.caption.text : null,
        author: media.user.username,
        authorpic: media.user.profile_picture,
    });

    item.title = util.format('%s', item.author);
    if (item.caption) {
        item.title += ': ' + Helpers.shortenString(item.caption, 30);
    }

    if (!item.video) {
        item.description = util.format('<p><a href="%s"><img src="%s" width="640" height="640"/></a></p>', item.url, item.image);
    } else {
        item.description = util.format('<p><video poster="%s" width="640" height="640" controls><source src="%s" type="video/mp4"></video></p>', item.image, item.video);
    }

    if (item.caption) {
        item.description += util.format('<p>%s</p>', Items.Instagram.Media.linkify(item.caption));
    }

    /*
    // trying to like/unlike doesn't work :(

    item.description += util.format('<form method="post" action="http://instagram.com/web/likes/%d/%s/"><input type="submit" value="%s"/></form>',
        media.id.split('_')[0],
        media.user_has_liked ? 'unlike' : 'like',
        media.user_has_liked ? 'unlike' : 'like');

    item.description += util.format('<p><a href="http://instagram.com/web/likes/%d/%s/">%s</a></p>',
        media.id.split('_')[0],
        media.user_has_liked ? 'unlike' : 'like',
        media.user_has_liked ? 'unlike' : 'like');
    */

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
            item.description += util.format('<p><strong><a href="http://instagram.com/%s">%s</a>:</strong> %s</p>', comment.from.username, comment.from.username, Items.Instagram.Media.linkify(comment.text));
        });
    }

    return item;
};

// Link usernames, tags, and urls.
Items.Instagram.Media.linkify = function(str) {
    str = str.replace(/@([\w]+)/g, '<a href="http://instagram.com/$1">@$1</a>');
    str = str.replace(/#([\w]+)/g, '<a href="https://instagram.com/explore/tags/$1/">#$1</a>');
    str = Autolinker.link(str);
    return str;
};

module.exports = Items.Instagram.Media;