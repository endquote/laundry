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
    this.beforeInput();
    this._client.get('/me', function(err, me) {
        if (err) {
            callback(err);
            return;
        }
        console.log(me);
    });
};

module.exports = Washers.SoundCloud.Timeline;