var Backbone = require('Backbone'); // http://backbonejs.org/
var fs = require('fs-extra'); // https://www.npmjs.com/package/fs-extra
var path = require('path'); // https://nodejs.org/api/path.html
var sanitize = require('sanitize-filename'); // https://www.npmjs.com/package/sanitize-filename
var async = require('async'); // https://www.npmjs.com/package/async
var log = require('winston'); // https://github.com/winstonjs/winston

var Washer = require('./washer');

// Singleton Laundry class, generally the entry point to the whole thing.
var Laundry = Backbone.Model.extend({

    // Valid commands and their descriptions.
    _commands: {
        'create': 'create [job] -- configure a new job',
        'edit': 'edit [job] -- edit the configuration of an existing job',
        'run': 'run [job] -- run an existing job',
        'delete': 'delete [job] -- delete an existing job',
        'list': 'list [job] -- list configured jobs',
        'tick': 'tick -- run on an interval to execute scheduled jobs',
        'daemon': 'daemon [port] -- run continuously and serve up generated static content',
        'version': 'version -- output version info',
        'help': 'help -- this help text'
    },

    constructor: function() {
        Backbone.Model.apply(this, arguments);
    },

    initialize: function() {},

    // Is the command you're trying to run a real command?
    isCommand: function(command) {
        return this._commands[command.trim().toLowerCase()] != null;
    },

    // Run a command.
    doCommand: function(command, job) {
        if (!this.isCommand(command)) {
            return false;
        }

        return this[command.trim().toLowerCase()](job);
    },

    // Output version info.
    version: function() {
        var package = require('./package.json');
        var docs = '';
        docs += '\nLaundry version ' + package.version + '\n';
        console.log(docs);
    },

    // Output help text.
    help: function() {
        this.version();
        var package = require('./package.json');
        var docs = '';
        docs += 'The available commands for laundry are as follows: \n\n';
        for (var i in this._commands) {
            docs += 'laundry ' + this._commands[i] + '\n';
        }

        docs += '\nFor more info see ' + package.homepage + '\n';
        console.log(docs);
    },

    // Given a job name, create a job folder and return a path to it.
    _getJobFolder: function(job, callback) {
        var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
        var configFolder = path.join(home, '.laundry');
        var jobFolder = path.join(configFolder, sanitize(job));
        fs.mkdirs(jobFolder, function(err) {
            callback(err, jobFolder);
        });
    },

    // Create a new job.
    create: function(job) {
        log.info(job + ' - creating');
        this._getJobFolder(job, function(err, jobFolder) {
            console.log(jobFolder);
        });

        console.log(new Washer().get('input'));
    },

    // Edit an existing job.
    edit: function(job) {

    },

    // Run a job.
    run: function(job) {

    },

    // Delete a job.
    delete: function(job) {

    },

    // List current jobs.
    list: function(job) {

    },

    // Run jobs according to their schedule.
    tick: function(job) {

    },

    // Run continuously and serve up generated static content.
    daemon: function(port) {

    }
});

module.exports = exports = new Laundry();