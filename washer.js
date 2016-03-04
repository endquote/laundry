'use strict';

// Base class for washers. Washers can accept input from the web, parse it into general-purpose objects,
// and return it to other washers which output those objects to other formats.
var Washer = function(config, job) {
    this._job = job;

    // The user-facing name of the washer. Leave empty to not show it as an option.
    this.name = null;

    // The internal name.
    this.className = Helpers.buildClassName(__filename);

    // An object describing the input function of this washer, if any. It contains a user-facing
    // description of the functionality, and an array of settings required to configure it.
    /*
    this.input = _.merge({
            // Shown in the list of washers
        description: 'Loads data from an RSS feed.',

        // An array of settings to ask about
        settings: [{
            // The property name to save this setting as. 
            name: 'url',

            // The prompt to give the user.
            prompt: 'What RSS feed URL do you want to launder?',

            // Called before asking the user for a value, callback indicating whether a
            // response is required, what the prompt should be, and a suggested default.
            beforeEntry: function(rl, job, prompt, callback(required, prompt, suggest)),

            // Called after the user has entered a value, so it can be validated, modified
            // or acted upon in some way. Callback indicating whether the value is valid,
            // and what the new value is.
            afterEntry: function(rl, job, oldValue, newValue, callback(err, newValue))
        }]
    }, this.input);
    */
    this.input = null;

    // An object describing the output function of this washer, if any. Format is the same
    // as input.
    this.output = null;

    // Any configuration object passed in is copied as public properties of the class.
    if (config) {
        for (var i in config) {
            this[i] = config[i];
        }
    }
};

Washer.className = Helpers.buildClassName(__filename);

Washer.downloadMediaOption = {
    name: 'downloadMedia',
    prompt: 'Download media? (y/n)',
    beforeEntry: function(rl, job, prompt, callback) {
        callback(true, prompt, this.downloadMedia === undefined ? 'y' : (this.downloadMedia ? 'y' : 'n'));
    },
    afterEntry: function(rl, job, oldValue, newValue, callback) {
        newValue = newValue.toLowerCase();
        var valid = newValue === 'y' || newValue === 'n';
        callback(!valid, newValue === 'y');
    }
};

// Remove stuff from the washer that's saved to disk.
Washer.prototype.stringify = function() {
    var c = _.clone(this);
    delete c.input;
    delete c.output;
    delete c.name;
    for (var i in c) {
        if (i.indexOf('_') === 0) {
            delete(c[i]);
        }
    }
    return c;
};

Washer.prototype.doInput = function(callback) {
    callback(null, []);
};

Washer.prototype.doOutput = function(items, callback) {
    callback(null);
};

module.exports = Washer;
