'use strict';

var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client
var youtube = google.youtube('v3'); // https://developers.google.com/youtube/v3/docs/

/*
Base class for YouTube washers containing common methods.
input: none
output: none
*/
ns('Washers.Google', global);
Washers.Google.YouTube = function(config) {
    Washers.Google.call(this, config);

    this.name = '';
    this.classFile = path.basename(__filename);
    this._oauth2Client = null;

    this.input = _.merge({}, this.input);
};

Washers.Google.YouTube.prototype = _.create(Washers.Google.prototype);

Washers.Google.YouTube.prototype.parseVideo = function(video) {
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
    return new Items.Google.YouTube.Video({
        url: url,
        thumbnail: thumbnail.url,
        title: video.snippet.channelTitle + ': ' + video.snippet.title,
        author: video.snippet.channelTitle,
        date: moment(video.snippet.publishedAt)
    });
};

module.exports = Washers.Google.YouTube;