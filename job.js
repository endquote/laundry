'use strict';

var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename

function Job(config) {
    this.name = config ? config.name : null;
    this.schedule = config ? config.schedule : null;
    this.lastRun = config && config.lastRun ? moment(config.lastRun) : null;
    this.filter = config ? config.filter : null;
    this.input = config && config.input ? new allWashers[config.input.className](config.input) : null;
    this.output = config && config.output ? new allWashers[config.output.className](config.output) : null;
}

// Save the job file to disk.
Job.prototype.save = function(callback) {
    fs.writeFile(Job.getPath(this.name), JSON.stringify(this, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4), callback);
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
                    if (config.name) {
                        job = new Job(config);
                    }
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
            if (path.extname(item) !== '.json') {
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
            jobs = _.sortBy(jobs, 'name');
            callback(jobs);
        });
    });
};

module.exports = Job;