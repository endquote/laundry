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

    Storage.initLog();
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
            var jobs = [];
            laundryConfig.jobs.forEach(function(jobConfig, i) {
                try {
                    jobs.push(new Job(jobConfig));
                } catch (e) {
                    log.error('Job could not be created from config:');
                    log.error(jobConfig);
                    log.error(e);
                }
            });
            laundryConfig.jobs = jobs;
            loaded = true;
        } catch (e) {
            loaded = false;
            // log.warn('Config not found, using default.');
        }

        // Set defaults for settings.
        if (!laundryConfig.settings.ytdlupdate) {
            laundryConfig.settings.ytdlupdate = new Date().getTime();
        }

        // Deserialize any settings.
        laundryConfig.settings.ytdlupdate = moment(new Date(laundryConfig.settings.ytdlupdate));

        callback(null, laundryConfig);
    });
};

// Save the global config file.
Storage.saveConfig = function(callback) {
    var c = _.clone(laundryConfig);

    // Serialize any settings.
    c.settings.ytdlupdate = c.settings.ytdlupdate.valueOf();

    // Serialize the jobs -- stringify methods on Job and Washer return cleaned-up objects.
    var configString = JSON.stringify(c, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4);

    Storage.writeFile('config.json', configString, callback);
};

// Create a logger using the current storage mode. If a job is passed, create the category for that job.
Storage.initLog = function(job) {
    // Storage modes define configLog to set different options.
    var opts = Storage.configLog(job);

    if (!job) {
        log.add(log.transports.File, opts);
        log.add(log.transports.Console, {
            colorize: true,
            level: global.log.level
        });
        log.stream = opts.stream;
    } else {
        var category = 'job-' + job.name;
        log.loggers.add(category, {
            file: opts,
            console: {
                colorize: true,
                level: global.log.level
            }
        });
        job.log = log.loggers.get(category);
        job.log.stream = opts.stream;
    }
};

module.exports = Storage;
