var Backbone = require('Backbone'); // http://backbonejs.org/
var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html
var async = require('async'); // https://www.npmjs.com/package/async
var log = require('winston'); // https://github.com/winstonjs/winston
var util = require('util'); // https://nodejs.org/api/util.html

var Washer = require('./washer');
var Washers = require('./requireFolderNs')('./washers');
var Job = require('./job');

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

    // Create a new job.
    create: function(jobName) {
        log.info(jobName + ' - creating');
        Job.getJob(jobName, function(job) {
            job.save();
        });
    },

    // Edit an existing job.
    edit: function(jobName) {

    },

    // Run a job.
    run: function(jobName) {

    },

    // Delete a job.
    delete: function(jobName) {

    },

    // List current jobs.
    list: function() {
        var out = 'Current jobs: \n';

        Job.getAllJobs(function(jobs) {
            if (!jobs) {
                out = 'There are no jobs configured. Use "laundry create [job]" to make one.';
            }

            // sort?
            jobs.forEach(function(job) {
                if (job.get('after')) {
                    out += util.format('%s runs after %s.', job.get('name'), job.get('after'));
                } else if (!job.get('frequency')) {
                    out += util.format('%s runs manually.', job.get('name'));
                } else {
                    out += util.format('%s runs every %d minutes.', job.get('name'), job.get('frequency'));
                }
                out += '\n';
            });

            console.log(out);
        });
    },

    // Run jobs according to their schedule.
    tick: function() {

    },

    // Run continuously and serve up generated static content.
    daemon: function(port) {

    }
});

module.exports = exports = new Laundry();