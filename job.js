var Backbone = require('Backbone'); // http://backbonejs.org/
var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename
var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html
var async = require('async'); // https://www.npmjs.com/package/async

var Job = Backbone.Model.extend({
    defaults: {
        name: null,
        schedule: null,
        input: null,
        output: null,
        filter: null
    },

    // Save the job file to disk.
    save: function(callback) {
        fs.writeFile(Job.getPath(this.get('name')), JSON.stringify(this.toJSON(), null, 4), callback);
    }
}, {
    // Return the file path for the job file.
    getPath: function(jobName) {
        var configFile = sanitize(jobName) + '.json';
        var filePath = path.join($$configFolder, configFile);
        return filePath;
    },

    // Return an existing job object, or create a new one.
    getJob: function(jobName, callback) {
        if (!callback) {
            return;
        }

        var job = new Job({
            name: jobName
        });

        var filePath = Job.getPath(jobName);
        fs.exists(filePath, function(exists) {
            if (!exists) {
                callback(job);
                return;
            }

            fs.readFile(filePath, {
                encoding: 'utf8'
            }, function(err, data) {
                if (!err) {
                    try {
                        var config = JSON.parse(data);
                        job = new Job(config);

                        var input = null;
                        try {
                            input = require('./washers/' + job.get('input').name);
                            input = new input(job.get('input'));
                        } catch (e) {}
                        job.set('input', input);

                        var output = null;
                        try {
                            output = require('./washers/' + job.get('output').name);
                            output = new output(job.get('output'));
                        } catch (e) {}
                        job.set('output', output);

                    } catch (e) {}
                }
                callback(job);
            });
        });
    },

    // Return an array of all job objects.
    getAllJobs: function(callback) {
        if (!callback) {
            return;
        }

        var jobs = [];
        fs.readdir($$configFolder, function(err, files) {
            if (err || !files.length) {
                callback(jobs);
                return;
            }

            async.each(files, function(item, callback) {
                if (path.extname(item) != '.json') {
                    callback();
                    return;
                }

                var filePath = path.join($$configFolder, item);
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
            })
        });
    }
});

module.exports = Job;