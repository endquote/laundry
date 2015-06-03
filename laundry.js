var Backbone = require('Backbone'); // http://backbonejs.org/
var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html
var async = require('async'); // https://www.npmjs.com/package/async
var log = require('winston'); // https://github.com/winstonjs/winston
var util = require('util'); // https://nodejs.org/api/util.html
var readline = require('readline'); // https://nodejs.org/api/readline.html
var wrap = require('word-wrap'); // https://www.npmjs.com/package/word-wrap

var Washer = require('./washer');
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

    _wrapOpts: {
        width: 70
    },

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

        var that = this;
        async.waterfall([

            // Get all the washers and filter by the ones that support input.
            function(callback) {
                Washer.getAllWashers(function(washers) {
                    callback(null, washers);
                });
            },

            // Get the job
            function(allWashers, callback) {
                Job.getJob(jobName, function(job) {
                    callback(null, job, allWashers);
                });
            },

            // Set up the console and ask for the source washer.
            function(job, allWashers, callback) {
                var validWashers = allWashers.filter(function(washer) {
                    return washer.configInput
                });

                var rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    completer: function(line) {
                        line = line.toLowerCase();
                        var completions = validWashers.map(function(washer) {
                            return washer.get('name');
                        });
                        completions.sort();
                        completions = completions.filter(function(completion) {
                            return completion.toLowerCase().indexOf(line) != -1
                        });
                        return [completions, line];
                    }
                });

                var washersList = '';
                validWashers.forEach(function(washer) {
                    washersList += util.format('%s - %s', washer.get('name'), washer.description);
                });

                var q = util.format("Great, let's create a new job called %s. Where do you want to launder data from? The sources we have are:\n%s\n", job.get('name'), washersList);
                q = wrap(q, that._wrapOpts);

                rl.question(q, function(answer) {
                    callback(null, rl, answer, job, allWashers, validWashers);
                });
            },

            // Validate that the first washer is real and configure it.
            function(rl, answer, job, allWashers, validWashers, callback) {
                var washer = validWashers.filter(function(washer) {
                    return washer.get('name').toLowerCase() == answer.toLowerCase();
                })[0];

                if (!washer) {
                    rl.write(wrap("Hm, couldn't find that one.", that._wrapOpts));
                    callback(true, rl);
                    return;
                }

                rl.write(wrap(util.format("Cool, we'll start with %s.\n", washer.get('name')), that._wrapOpts));

                job.get('config').push(washer);

                // For each of the config options, ask for a value and validate the input.
                var config = {};
                async.eachSeries(washer.configInput, function(item, callback) {
                    var valid = false;
                    async.whilst(function() {
                            return !valid;
                        },
                        function(callback) {
                            rl.question(wrap(item.prompt + '\n', that._wrapOpts), function(answer) {
                                // TODO: Validate answers according to field type
                                valid = answer;
                                if (valid) {
                                    config[item.name] = answer;
                                } else {
                                    rl.write(wrap("That's not a valid answer. Let's try again.\n", that._wrapOpts));
                                }
                                callback();
                            })
                        }, function(err) {
                            callback(err);
                        });
                }, function(err) {
                    washer.set('input', config);
                    callback(err, rl, job);
                });
            }
        ], function(err, rl, job) {
            if (!err && job) {
                job.save();
            }

            rl.write('\n');
            rl.close();
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
            if (!jobs.length) {
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