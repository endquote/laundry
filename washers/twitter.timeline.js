'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Twitter Timeline washer
input: converts media from the user's Twitter timeline into items
output: none
*/
ns('Washers.Twitter', global);
Washers.Twitter.Timeline = function(config) {
    Washers.Twitter.call(this, config);

    this.name = 'Twitter/Timeline';
    this.className = path.basename(__filename.replace('.js', ''));

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from your Twitter timeline.'
    });
};

Washers.Twitter.Timeline.prototype = Object.create(Washers.Twitter.prototype);

Washers.Twitter.Timeline.prototype.doInput = function(callback) {

};

module.exports = Washers.Twitter.Timeline;