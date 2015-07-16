'use strict';

/*
Converts media from the user's SoundCloud timeline into items.
input: none
output: none
*/
ns('Washers.SoundCloud', global);
Washers.SoundCloud.Timeline = function(config) {
    Washers.SoundCloud.call(this, config);

    this.name = 'SoundCloud/Timeline';
    this.className = Helpers.classNameFromFile(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent sounds from your SoundCloud timeline.'
    });
};

Washers.SoundCloud.Timeline.prototype = Object.create(Washers.SoundCloud.prototype);

Washers.SoundCloud.Timeline.prototype.doInput = function(callback) {
    Helpers.jsonRequest(
        extend(this._requestOptions, {
            uri: 'https://api.soundcloud.com/me'
        }), function(err, response) {
            if (err) {
                callback(err);
                return;
            }
            console.log(response);
            callback(err);
        });
};

module.exports = Washers.SoundCloud.Timeline;