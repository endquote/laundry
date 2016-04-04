'use strict';

var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename

function Job(config) {
    this.name = config ? config.name : null;
    this.schedule = config ? config.schedule : null;
    this.lastRun = config && config.lastRun ? moment(config.lastRun) : null;
    this.input = config && config.input ? new allWashers[config.input.className](config.input, this) : null;
    this.output = config && config.output ? new allWashers[config.output.className](config.output, this) : null;
}

// Remove stuff from the job that's saved to disk.
Job.prototype.stringify = function() {
    var c = _.clone(this);
    delete c.log;
    for (var i in c) {
        if (i.indexOf('_') === 0) {
            delete(c[i]);
        }
    }

    return c;
};

module.exports = Job;
