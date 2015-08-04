'use strict';

/*
Base class for YouTube washers containing common methods.
input: none
output: none
*/
ns('Washers.Google', global);
Washers.Google.YouTube = function(config, job) {
    Washers.Google.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);

    this._requestOptions = extend({
        baseUrl: 'https://www.googleapis.com/youtube/v3/'
    }, this._requestOptions);

    this.input = _.merge({}, this.input);
};

Washers.Google.YouTube.prototype = Object.create(Washers.Google.prototype);
Washers.Google.YouTube.className = Helpers.buildClassName(__filename);

module.exports = Washers.Google.YouTube;
