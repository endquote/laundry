/* jslint node: true */
/* jshint strict: true */
'use strict';

var _ = require('lodash'); // https://lodash.com/docs
var path = require('path'); // https://nodejs.org/api/path.html
var ns = require('simple-namespace'); // https://www.npmjs.com/package/simple-namespace

var Washer = require('../washer');
var Item = require('../item');

/*
Youtube Subscriptions washer
input: converts videos from the user's YouTube subscriptions into items
output: null
*/

ns('Washers.Google', global);
Washers.Google.YouTube = function(config) {
    Washer.call(this, config);

    this.name = 'YouTube/Subscriptions';
    this.classFile = path.basename(__filename);

    this.input = {
        description: 'Loads recent videos from your YouTube subscriptions.'
    };
};

Washers.Google.YouTube.prototype = _.create(Washer.prototype, {
    constructor: Washers.Google.YouTube
});

Washers.Google.YouTube.prototype.doInput = function(callback) {
    callback();
};

Washers.Google.YouTube.Item = function(config) {
    Item.call(this, config);
};

Washers.Google.YouTube.Item.prototype = _.create(Item.prototype, {
    constructor: Washers.Google.YouTube.Item
});

module.exports = Washers.Google.YouTube;