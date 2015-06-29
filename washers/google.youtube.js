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
    this.className = path.basename(__filename.replace('.js', ''));
    this._oauth2Client = null;

    this.input = _.merge({}, this.input);
};

Washers.Google.YouTube.prototype = Object.create(Washers.Google.prototype);

module.exports = Washers.Google.YouTube;