'use strict';

// Misc static storage functions.
function Storage() {}

// Set the storage class to use.
Storage.init = function() {
    Storage.mode = null;
    if (commander.local) {
        Storage.mode = require('./storage/local');
    } else if (commander.s3key) {
        Storage.mode = require('./storage/s3');
    }

    if (!Storage.mode) {
        throw new Error("Couldn't find a storage mode.");
    }

    for (var i in Storage.mode) {
        Storage[i] = Storage.mode[i];
    }
};

// Load the global config file.
Storage.loadConfig = function(callback) {
    global.laundryConfig = {
        settings: {},
        jobs: []
    };

    Storage.readFileString('config.json', function parseConfig(err, contents) {
        if (err) {
            callback(err);
            return;
        }

        var loaded = false;
        try {
            laundryConfig = JSON.parse(contents);
            laundryConfig.jobs.forEach(function(jobConfig, i) {
                laundryConfig.jobs[i] = new Job(jobConfig);
            });
            loaded = true;
        } catch (e) {
            loaded = false;
            log.warn('Config not found, using default.');
        }
        /* // Not using any custom settings, but this is how they would work.
        // Set defaults for settings.
        if (!laundryConfig.settings.ytdlupdate) {
            laundryConfig.settings.ytdlupdate = new Date().getTime();
        }

        // Deserialize any settings.
        laundryConfig.settings.ytdlupdate = moment(new Date(laundryConfig.settings.ytdlupdate));
        */
        callback(null, laundryConfig);
    });
};

// Save the global config file.
Storage.saveConfig = function(callback) {
    var c = _.clone(laundryConfig);
    /* // Not using any custom settings, but this is how they would work.
    // Serialize any settings.
    c.settings.ytdlupdate = c.settings.ytdlupdate.valueOf();
    */
    var configString = JSON.stringify(c, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4);

    Storage.writeFile('config.json', configString, callback);
};

module.exports = Storage;
