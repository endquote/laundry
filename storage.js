'use strict';

// Misc static storage functions.
function Storage() {}

// Set the storage class to use.
Storage.init = function() {
    var mode = null;
    if (commander.local) {
        mode = require('./storage/local');
    } else if (commander.s3key) {
        mode = require('./storage/s3');
    }

    if (!mode) {
        throw new Error("Couldn't find a storage mode.");
    }

    for (var i in mode) {
        Storage[i] = mode[i];
    }
};

// Load the global config file.
Storage.loadConfig = function(callback) {
    global.laundryConfig = {
        settings: {},
        jobs: []
    };

    function parseConfig(err, contents) {
        if (err) {
            callback(err);
            return;
        }
        try {
            laundryConfig = JSON.parse(contents);
            laundryConfig.jobs.forEach(function(jobConfig, i) {
                laundryConfig.jobs[i] = new Job(jobConfig);
            });
            callback(null, laundryConfig);
        } catch (e) {
            log.warn('Config not found, using default.');
            callback(null, laundryConfig);
        }
    }

    Storage.readFileString('config.json', parseConfig);
};

// Save the global config file.
Storage.saveConfig = function(callback) {
    var configString = JSON.stringify(laundryConfig, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4);

    Storage.writeFile('config.json', configString, callback);
};

module.exports = Storage;