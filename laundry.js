var fs = require('fs-extra'); // https://www.npmjs.com/package/fs-extra
var path = require('path'); // https://nodejs.org/api/path.html
var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename
var async = require('async'); // https://www.npmjs.com/package/async
var log = require('winston'); // https://github.com/winstonjs/winston

var Washer = require('./washer');

// Singleton Laundry class, generally the entry point to the whole thing.
function Laundry() {}

// Valid commands and their descriptions.
Laundry.prototype._commands = {
    'create': 'create [job] -- configure a new job',
    'edit': 'edit [job] -- edit the configuration of an existing job',
    'run': 'run [job] -- run an existing job',
    'delete': 'delete [job] -- delete an existing job',
    'list': 'list [job] -- list configured jobs',
    'tick': 'tick -- run on an interval to execute scheduled jobs',
    'daemon': 'daemon [port] -- run continuously and serve up generated static content',
    'version': 'version -- output version info',
    'help': 'help -- this help text'
};

// Is the command you're trying to run a real command?
Laundry.prototype.isCommand = function(command) {
    return this._commands[command.trim().toLowerCase()] != null;
}

// Run a command.
Laundry.prototype.doCommand = function(command, job) {
    if (!this.isCommand(command)) {
        return false;
    }

    return this[command.trim().toLowerCase()](job);
}

// Output version info.
Laundry.prototype.version = function() {
    var package = require('./package.json');
    var docs = '';
    docs += '\nLaundry version ' + package.version + '\n';
    console.log(docs);
}

// Output help text.
Laundry.prototype.help = function() {
    this.version();
    var package = require('./package.json');
    var docs = '';
    docs += 'The available commands for laundry are as follows: \n\n';
    for (var i in this._commands) {
        docs += 'laundry ' + this._commands[i] + '\n';
    }

    docs += '\nFor more info see ' + package.homepage + '\n';
    console.log(docs);
}

// Given a job name, create a job folder and return a path to it.
Laundry.prototype._getJobFolder = function(job, callback) {
    var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
    var configFolder = path.join(home, '.laundry');
    var jobFolder = path.join(configFolder, sanitize(job));
    fs.mkdirs(jobFolder, function(err) {
        callback(err, jobFolder);
    });
}

// Create a new job.
Laundry.prototype.create = function(job) {
    log.info(job + ' - creating');
    this._getJobFolder(job, function(err, jobFolder) {
        console.log(jobFolder);
    });

    console.log(new Washer().config);
}

// Edit an existing job.
Laundry.prototype.edit = function(job) {

}

// Run a job.
Laundry.prototype.run = function(job) {

}

// Delete a job.
Laundry.prototype.delete = function(job) {

}

// List current jobs.
Laundry.prototype.list = function(job) {

}

// Run jobs according to their schedule.
Laundry.prototype.tick = function(job) {

}

// Run continuously and serve up generated static content.
Laundry.prototype.daemon = function(port) {

}

module.exports = exports = new Laundry();