'use strict';

/*
Base class for YouTube washers containing common methods.
input: none
output: none
*/
ns('Washers.Google', global);
Washers.Google.YouTube = function(config) {
    Washers.Google.call(this, config);

    this.name = '';
    this.className = Helpers.classNameFromFile(__filename);

    this._requestOptions = {
        baseUrl: 'https://www.googleapis.com/youtube/v3/',
        headers: {
            Authorization: 'Bearer ' + (this.token ? this.token.access_token : '')
        }
    };

    this.input = _.merge({}, this.input);
};

Washers.Google.YouTube.prototype = Object.create(Washers.Google.prototype);

module.exports = Washers.Google.YouTube;
