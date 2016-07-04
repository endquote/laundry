'use strict';

// Base class for washers. Washers can accept input from the web, parse it into general-purpose objects,
// and return it to other washers which output those objects to other formats.
var Washer = function(config, job) {
    this.job = job;

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

        // An array of settings to ask about, in the format of Inquirer.js prompt objects
        // https://github.com/SBoudrias/Inquirer.js
        prompts: [{
            // The type of question to ask, default is "input"
            type: 'input',

            // The property name to save this setting as. 
            name: 'url',

            // The prompt to give the user.
            message: 'What RSS feed URL do you want to launder?',

            // Called after a value is entered, return true if it's valid, false or an error message if not.
            // The default validation function ensures the value is not an empty string.
            validate: function(answer)

            // Called after a valid value is entered, return it modified if needed.
            filter: function(value),

            // Return a default value for this setting, or set to a string
            default: function(),

            // An addition to the inquirer functionality -- if you need to set a default or other property based on the job.
            setup: function(job)
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

Washer.downloadMediaOption = function(download) {
    return {
        type: 'confirm',
        name: 'downloadMedia',
        message: 'Download media?',
        default: download
    };
};

Washer.onlyNewOption = function(onlyNew) {
    return {
        type: 'confirm',
        name: 'onlyNew',
        message: 'Post only items created since the last run?',
        default: onlyNew
    };
};

Washer.quantityOption = function(count, message) {
    return {
        type: 'input',
        name: 'quantity',
        message: message || 'How many items do you want to retrieve?',
        default: count || 20,
        validate: function(value, answers) {
            return value && validator.isInt(value.toString());
        }
    };
};

// Remove stuff from the washer that's saved to disk.
Washer.prototype.stringify = function() {
    var c = _.clone(this);
    delete c.input;
    delete c.output;
    delete c.name;
    delete c.job;
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
