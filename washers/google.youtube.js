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
    this.classFile = path.basename(__filename);
    this._oauth2Client = null;

    this.input = _.merge({}, this.input);
};

Washers.Google.YouTube.prototype = _.create(Washers.Google.prototype);

module.exports = Washers.Google.YouTube;