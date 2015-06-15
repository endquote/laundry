'use strict';

var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

// Item which describes a YouTube video
ns('Items.Google.YouTube', global);
Items.Google.YouTube.Video = function(config) {
    this.thumbnail = null;

    Item.call(this, config);
};

Items.Google.YouTube.Video.prototype = _.create(Item.prototype);

// Convert a video from the api response into a laundry item.
Items.Google.YouTube.Video.factory = function(video) {

    var url = 'https://youtube.com/watch?v=' + video.contentDetails.videoId;

    // Figure out the biggest thumbnail available.
    var thumbnails = [];
    for (var i in video.snippet.thumbnails) {
        thumbnails.push(video.snippet.thumbnails[i]);
    }
    var thumbnail = thumbnails.sort(function(a, b) {
        return a.width - b.width;
    }).pop();

    // Reformat the description a bit.
    var description = video.snippet.description;
    description = description.replace(/[\n\r]{2,}/gim, '</p><p>');
    description = description.replace(/[\n\r]/gim, '<br/>');
    description = '<p><a href="' + url + '"><img src="' + thumbnail.url + '"/></a></p><p>' + description + '</p>';
    description = Autolinker.link(description);

    // Would be cool to get this working, but you have to POST to it in a specific way...
    // https://www.youtube.com/watch_actions_ajax?action_like_video=1&video_id=3FOzD4Sfgag
    // https://www.youtube.com/watch_actions_ajax?action_dislike_video=1&video_id=3FOzD4Sfgag

    return new Items.Google.YouTube.Video({
        title: video.snippet.channelTitle + ': ' + video.snippet.title,
        description: description,
        url: url,
        date: moment(video.snippet.publishedAt),
        author: video.snippet.channelTitle,
        thumbnail: thumbnail.url
    });
};

module.exports = Items.Google.YouTube.Video;