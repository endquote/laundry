'use strict';

var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client
var youtube = google.youtube('v3'); // https://developers.google.com/youtube/v3/docs/
var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

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

module.exports = Washers.Google.YouTube;