/* jslint node: true */
/* jshint strict: true */
'use strict';

var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename
var fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
var path = require('path'); // https://nodejs.org/api/path.html
var async = require('async'); // https://www.npmjs.com/package/async

function Job(config) {
    this.name = config ? config.name : null;
    this.schedule = config ? config.schedule : null;
    this.input = null;
    this.output = null;
    this.filter = null;

    var Washer = null;
    if (config.input) {
        try {
            Washer = require('./washers/' + config.input.name);
            this.input = new Washer(config.input);
        } catch (e) {
            console.log(e);
        }
    }

    if (config.output) {
        try {
            Washer = require('./washers/' + config.output.name);
            this.output = new Washer(config.output);
        } catch (e) {}
    }
}

// Save the job file to disk.
Job.prototype.save = function(callback) {
    fs.writeFile(Job.getPath(this.name), JSON.stringify(this.toJSON(), null, 4), callback);
};

Job.prototype.del = function(callback) {
    fs.unlink(Job.getPath(this.name), callback);
};

// Return the file path for the job file.
Job.getPath = function(jobName) {
    var configFile = sanitize(jobName) + '.json';
    var filePath = path.join(global.configFolder, configFile);
    return filePath;
};

// Return an existing job object, or create a new one.
Job.getJob = function(jobName, callback) {
    if (!callback) {
        return;
    }

    var job = null;

    var filePath = Job.getPath(jobName);
    fs.exists(filePath, function(exists) {
        if (!exists) {
            callback();
            return;
        }

        fs.readFile(filePath, {
            encoding: 'utf8'
        }, function(err, data) {
            if (!err) {
                try {
                    var config = JSON.parse(data);
                    job = new Job(config);
                } catch (e) {}
            }
            callback(job);
        });
    });
};

// Return an array of all job objects.
Job.getAllJobs = function(callback) {
    if (!callback) {
        return;
    }

    var jobs = [];
    fs.readdir(global.configFolder, function(err, files) {
        if (err || !files.length) {
            callback(jobs);
            return;
        }

        async.each(files, function(item, callback) {
            if (path.extname(item) != '.json') {
                callback();
                return;
            }

            var filePath = path.join(global.configFolder, item);
            fs.stat(filePath, function(err, stats) {
                if (!stats.isFile()) {
                    callback();
                    return;
                }

                var jobName = path.basename(filePath).split('.')[0];
                Job.getJob(jobName, function(job) {
                    jobs.push(job);
                    callback();
                });
            });

        }, function(err) {
            callback(jobs);
        });
    });
};

module.exports = Job;