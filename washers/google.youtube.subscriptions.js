/* jslint node: true */
/* jshint strict: true */
'use strict';

/*
Youtube Subscriptions washer
input: converts videos from the user's YouTube subscriptions into items
output: null
*/

ns('Washers.Google.YouTube', global);
Washers.Google.YouTube.Subscriptions = function(config) {
    Washer.call(this, config);

    this.name = 'YouTube/Subscriptions';
    this.classFile = path.basename(__filename);

    this.input = {
        description: 'Loads recent videos from your YouTube subscriptions.'
    };
};

Washers.Google.YouTube.Subscriptions.prototype = _.create(Washer.prototype, {
    constructor: Washers.Google.YouTube.Subscriptions
});

Washers.Google.YouTube.Subscriptions.prototype.doInput = function(callback) {
    callback();
};

module.exports = Washers.Google.YouTube.Subscriptions;