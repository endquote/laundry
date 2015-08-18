'use strict';

// Misc static storage functions.
function Storage() {}

// Given a URL and an S3 target, copy the URL to S3.
// Cache is an array of keys to not upload, since they are there already.
// Optionally use youtube-dl to transform the url to a media url.
// The callback is (err, {oldUrl, newUrl, error, ytdl})
// The ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Storage.downloadUrl = function(url, target, cache, useYTDL, callback) {
    if (commander.local) {
        Storage.Local.downloadUrl(url, target, cache, useYTDL, callback);
    } else if (commander.s3key) {
        Storage.S3.downloadUrl(url, target, cache, useYTDL, callback);
    } else {
        callback(null, {
            oldUrl: url,
            newUrl: url,
            error: null,
            ytdl: null
        });
    }
};

// Given a directory, return all the files.
Storage.cacheFiles = function(dir, callback) {
    if (commander.local) {
        Storage.Local.cacheFiles(dir, callback);
    } else if (commander.s3key) {
        Storage.S3.cacheFiles(dir, callback);
    } else {
        callback();
    }
};

// Delete files with a last-modified before a given date.
Storage.deleteBefore = function(dir, date, callback) {
    if (commander.local) {
        Storage.Local.deleteBefore(dir, date, callback);
    } else if (commander.s3key) {
        Storage.S3.deleteBefore(dir, date, callback);
    } else {
        callback();
    }
};

// Write some data to a file.
Storage.writeFile = function(target, contents, callback) {
    if (commander.local) {
        Storage.Local.writeFile(target, contents, callback);
    } else if (commander.s3key) {
        Storage.S3.writeFile(target, contents, callback);
    } else {
        callback();
    }
};

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
            laundryConfig.jobs.forEach(function(jobConfig) {
                allJobs.push(new Job(jobConfig));
            });
            callback(null, laundryConfig);
        } catch (e) {
            log.warn('Config not found, using default.');
            callback(null, laundryConfig);
        }
    }

    if (commander.local) {
        Storage.Local.readFileString('config.json', parseConfig);
    } else if (commander.s3key) {
        Storage.S3.readFileString('config.json', parseConfig);
    } else {
        callback('Either a local path or S3 credentials must be specified.');
    }
};

Storage.saveConfig = function(callback) {
    laundryConfig.jobs = allJobs;
    var configString = JSON.stringify(laundryConfig, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4);

    if (commander.local) {
        Storage.Local.writeFile('config.json', configString, callback);
    } else if (commander.s3key) {
        Storage.S3.writeFile('config.json', configString, callback);
    } else {
        callback('Nowhere to save config...');
    }
};

module.exports = Storage;
