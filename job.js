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

Job.prototype.del = function(callback) {
    fs.unlink(Job.getPath(this.name), callback);
};

module.exports = Job;
