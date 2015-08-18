'use strict';

// Misc static storage functions.
function Storage() {}

// Set the storage class to use.
Storage.init = function() {
    if (commander.local) {
        Storage._mode = Storage.Local;
    } else if (commander.s3key) {
        Storage._mode = Storage.S3;
    }
};

// Given a URL and a target, copy the URL to the target.
// Cache is an array of files to not upload, since they are there already.
// Optionally use youtube-dl to transform the url to a media url.
// The callback is (err, {oldUrl, newUrl, error, ytdl})
// The ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Storage.downloadUrl = function(url, target, cache, useYTDL, callback) {
    Storage._mode.downloadUrl(url, target, cache, useYTDL, callback);
};

// Given a directory, return all the files.
Storage.cacheFiles = function(dir, callback) {
    Storage._mode.cacheFiles(dir, callback);
};

// Delete files with a last-modified before a given date.
Storage.deleteBefore = function(dir, date, callback) {
    Storage._mode.deleteBefore(dir, date, callback);
};

// Write some data to a file.
Storage.writeFile = function(target, contents, callback) {
    Storage._mode.writeFile(target, contents, callback);
};

// Read a file as a string.
Storage.readFileString = function(target, callback) {
    Storage._mode.readFileString(target, callback);
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
