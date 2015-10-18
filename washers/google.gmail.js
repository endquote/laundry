'use strict';

/*
Base class for Gmail washers containing common methods.
input: none
output: none
*/
ns('Washers.Google', global);
Washers.Google.Gmail = function(config, job) {
    Washers.Google.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);

    this._requestOptions = extend({
        baseUrl: 'https://www.googleapis.com/gmail/v1/'
    }, this._requestOptions);

    this.input = _.merge({}, this.input);
};

Washers.Google.Gmail.prototype = Object.create(Washers.Google.prototype);
Washers.Google.Gmail.className = Helpers.buildClassName(__filename);

module.exports = Washers.Google.Gmail;
