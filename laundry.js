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
        var validWashers = [];

        async.waterfall([

            // Set up the console.
            function(callback) {
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

                callback(null, rl)
            },

            // Get the job
            function(rl, callback) {
                rl.write(wrap(util.format("Great, let's create a new job called %s.\n", jobName), that._wrapOpts));
                Job.getJob(jobName, function(job) {
                    callback(null, rl, job);
                });
            },

            // A: Get all the washers and filter by the ones that support input.
            function(rl, job, callback) {
                Washer.getAllWashers(function(washers) {
                    validWashers = washers.filter(function(washer) {
                        return washer.input
                    });
                    callback(null, rl, job);
                });
            },

            // B: Ask for the input washer.
            function(rl, job, callback) {
                var washersList = '';
                validWashers.forEach(function(washer) {
                    washersList += util.format('%s - %s', washer.get('name'), washer.input.description);
                });

                var list = util.format("Now to decide where to launder data from. The sources we have are:\n%s\n\n", washersList);
                rl.write(wrap(list, that._wrapOpts));

                var washer = null;
                async.whilst(function() {
                        return washer == null
                    }, function(callback) {
                        rl.question(wrap("Which source do you want to use? ", that._wrapOpts), function(answer) {
                            washer = validWashers.filter(function(washer) {
                                return washer.get('name').toLowerCase() == answer.toLowerCase();
                            })[0];
                            if (washer) {
                                rl.write(wrap(util.format("Cool, we'll start with %s.\n", washer.get('name')), that._wrapOpts));
                                job.set('input', washer);
                            } else {
                                rl.write(wrap("Hm, couldn't find that one. Try again?\n", that._wrapOpts));
                            }
                            callback();
                        });
                    },
                    function(err) {
                        callback(err, rl, job);
                    });
            },

            // C: Configure the input washer.
            function(rl, job, callback) {
                validWashers = [];
                var config = {};
                var washer = job.get('input');
                async.eachSeries(washer.input.settings, function(item, callback) {
                    var valid = false;
                    async.whilst(function() {
                            return !valid;
                        },
                        function(callback) {
                            rl.question(wrap(item.prompt + ' ', that._wrapOpts), function(answer) {
                                // TODO: Validate answers according to field type
                                valid = answer;
                                if (valid) {
                                    washer.set(item.name, answer);
                                } else {
                                    rl.write(wrap("That's not a valid answer. Try again?\n", that._wrapOpts));
                                }
                                callback();
                            })
                        }, function(err) {
                            callback(err);
                        });
                }, function(err) {
                    callback(err, rl, job);
                });
            },

            // A: Get all the washers and filter by the ones that support output.
            function(rl, job, callback) {
                Washer.getAllWashers(function(washers) {
                    validWashers = washers.filter(function(washer) {
                        return washer.output
                    });
                    callback(null, rl, job);
                });
            },

            // B: Request the output washer.
            function(rl, job, callback) {
                var washersList = '';
                validWashers.forEach(function(washer) {
                    washersList += util.format('%s - %s', washer.get('name'), washer.output.description);
                });

                var list = util.format("Now to decide where to send data to. The options we have are:\n%s\n\n", washersList);
                rl.write(wrap(list, that._wrapOpts));

                var washer = null;
                async.whilst(function() {
                        return washer == null
                    }, function(callback) {
                        rl.question(wrap("Which target do you want to use? ", that._wrapOpts), function(answer) {
                            washer = validWashers.filter(function(washer) {
                                return washer.get('name').toLowerCase() == answer.toLowerCase();
                            })[0];
                            if (washer) {
                                rl.write(wrap(util.format("Cool, we'll send it to %s.\n", washer.get('name')), that._wrapOpts));
                                job.set('output', washer);
                            } else {
                                rl.write(wrap("Hm, couldn't find that one. Try again?\n", that._wrapOpts));
                            }
                            callback();
                        });
                    },
                    function(err) {
                        callback(err, rl, job);
                    });
            },

            // C: Configure the output washer.
            function(rl, job, callback) {
                validWashers = [];
                var config = {};
                var washer = job.get('output');
                async.eachSeries(washer.output.settings, function(item, callback) {
                    var valid = false;
                    async.whilst(function() {
                            return !valid;
                        },
                        function(callback) {
                            rl.question(wrap(item.prompt + ' ', that._wrapOpts), function(answer) {
                                // TODO: Validate answers according to field type
                                valid = answer;
                                if (valid) {
                                    washer.set(item.name, answer);
                                } else {
                                    rl.write(wrap("That's not a valid answer. Try again?\n", that._wrapOpts));
                                }
                                callback();
                            })
                        }, function(err) {
                            callback(err);
                        });
                }, function(err) {
                    callback(err, rl, job);
                });
            },

            // TODO: Set frequency
            // TODO: Set filters
        ], function(err, rl, job) {
            if (!err && job) {
                job.save();
            }

            rl.write(wrap('Cool, the job %s is all set up!\n', that._wrapOpts), job.get('name'));
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