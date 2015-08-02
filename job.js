'use strict';

var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename

function Job(config) {
    this.name = config ? config.name : null;
    this.schedule = config ? config.schedule : null;
    this.lastRun = config && config.lastRun ? moment(config.lastRun) : null;
    this.filter = config ? config.filter : null;
    this.input = config && config.input ? new allWashers[config.input.className](config.input, this) : null;
    this.output = config && config.output ? new allWashers[config.output.className](config.output, this) : null;
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

module.exports = Job;
