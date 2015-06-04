var Backbone = require('Backbone'); // http://backbonejs.org/
var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html
var async = require('async'); // https://www.npmjs.com/package/async
var log = require('winston'); // https://github.com/winstonjs/winston
var util = require('util'); // https://nodejs.org/api/util.html
var readline = require('readline'); // https://nodejs.org/api/readline.html
var wrap = require('word-wrap'); // https://www.npmjs.com/package/word-wrap
var moment = require('moment'); // http://momentjs.com/docs/

var Washer = require('./washer');
var Job = require('./job');

// Singleton Laundry class, generally the entry point to the whole thing.
var Laundry = Backbone.Model.extend({

    // Valid commands and their descriptions.
    _commands: {
        'create': 'create -- configure a new job',
        'edit': 'edit -- edit the configuration of an existing job',
        'run': 'run [job] -- run an existing job',
        'delete': 'delete -- delete an existing job',
        'list': 'list -- list configured jobs',
        'tick': 'tick -- run on an interval to execute scheduled jobs',
        'server': 'server [port] -- run continuously and serve up generated static content',
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

        var that = this;
        var validWashers = [];
        var allJobs = [];

        async.waterfall([

            // Get all the jobs, for scheduling.
            function(callback) {
                Job.getAllJobs(function(jobs) {
                    allJobs = jobs;
                    callback()
                });
            },

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

            // Get a name for the job.
            function(rl, callback) {
                async.whilst(function() {
                        return !jobName;
                    },
                    function(callback) {
                        rl.question(wrap("What do you want to call this job? ", that._wrapOpts), function(answer) {
                            jobName = answer.trim();
                            if (!jobName) {
                                rl.write(wrap("That's not a valid name. Try again?\n", that._wrapOpts));
                            }
                            callback();
                        })
                    }, function(err) {
                        callback(err, rl, jobName);
                    });
            },

            // Get the job
            function(rl, jobName, callback) {
                var job = allJobs.filter(function(job) {
                    return job.get('name').toLowerCase() == jobName.toLowerCase();
                })[0];
                if (job) {
                    rl.write(wrap(util.format("There's already a job called '%s', so we'll edit it.\n", jobName), that._wrapOpts));
                    callback(null, rl, job);
                } else {
                    rl.write(wrap(util.format("Great, let's create a new job called '%s'.\n", jobName), that._wrapOpts));
                    Job.getJob(jobName, function(job) {
                        callback(null, rl, job);
                    });
                }
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
                                if (!job.get('input') || job.get('input').get('name') != washer.get('name')) {
                                    job.set('input', washer);
                                }
                            } else {
                                rl.write(wrap("Hm, couldn't find that one. Try again?\n", that._wrapOpts));
                            }
                            callback();
                        });
                        if (job.get('input')) {
                            rl.write(job.get('input').get('name'));
                        }
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
                                // TODO: (2) Validate answers according to field type
                                valid = answer;
                                if (valid) {
                                    washer.set(item.name, answer);
                                } else {
                                    rl.write(wrap("That's not a valid answer. Try again?\n", that._wrapOpts));
                                }
                                callback();
                            });
                            rl.write(washer.get(item.name));
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
                                if (!job.get('output') || job.get('output').get('name') != washer.get('name')) {
                                    job.set('output', washer);
                                }
                            } else {
                                rl.write(wrap("Hm, couldn't find that one. Try again?\n", that._wrapOpts));
                            }
                            callback();
                        });
                        if (job.get('output')) {
                            rl.write(job.get('output').get('name'));
                        }
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
                                // TODO: (2) Validate answers according to field type
                                valid = answer;
                                if (valid) {
                                    washer.set(item.name, answer);
                                } else {
                                    rl.write(wrap("That's not a valid answer. Try again?\n", that._wrapOpts));
                                }
                                callback();
                            });
                            rl.write(washer.get(item.name));
                        }, function(err) {
                            callback(err);
                        });
                }, function(err) {
                    callback(err, rl, job);
                });
            },

            // Configure scheduling.
            function(rl, job, callback) {
                validWashers = [];

                var prompt = '';
                prompt += "\nNow to set when this job will run.\n";
                prompt += "- Leave blank to run only when 'laundry run [job]' is called.\n";
                prompt += "- Enter a number to run after so many minutes. Entering 60 will run the job every hour.\n";
                prompt += "- Enter a time to run at a certain time every day, like '9:30' or '13:00'.\n";
                prompt += "- Enter the name of another job to run after that job runs.\n\n";
                rl.write(wrap(prompt, that._wrapOpts));

                var valid = false;
                async.whilst(function() {
                        return !valid;
                    },
                    function(callback) {
                        rl.question(wrap("How do you want the job to be scheduled? ", that._wrapOpts), function(answer) {
                            answer = answer.trim().toLowerCase();

                            if (!answer) {
                                valid = true;
                                rl.write(wrap(util.format("This job will only be run manually.\n"), that._wrapOpts));
                            } else if (answer.indexOf(':') != -1) {
                                var time = moment({
                                    hour: answer.split(':')[0],
                                    minute: answer.split(':')[1]
                                });
                                valid = time.isValid();
                                if (valid) {
                                    answer = time.hour() + ':' + time.minute();
                                    rl.write(wrap(util.format("This job will run every day at %s.\n", answer), that._wrapOpts));
                                }
                            } else if (!isNaN(parseInt(answer))) {
                                answer = parseInt(answer);
                                valid = answer > 0;
                                if (valid) {
                                    rl.write(wrap(util.format("This job will run every %d minutes.\n", answer), that._wrapOpts));
                                }
                            } else {
                                if (answer != job.get('name').toLowerCase()) {
                                    allJobs.forEach(function(job) {
                                        if (job.get('name').toLowerCase() == answer) {
                                            valid = true;
                                            answer = job.get('name');
                                            rl.write(wrap(util.format("This job will run after the job '%s'.\n", answer), that._wrapOpts));
                                        }
                                    });
                                }
                            }

                            if (valid) {
                                job.set('schedule', answer);
                            } else {
                                rl.write(wrap("That's not a valid answer. Try again?\n", that._wrapOpts));
                            }
                            callback();
                        });
                        if (job.get('schedule')) {
                            rl.write(job.get('schedule').toString());
                        }
                    }, function(err) {
                        callback(err, rl, job);
                    });
            }

            // TODO: (3) Set filters
        ], function(err, rl, job) {
            if (!err && job) {
                job.save();
            }

            rl.write(wrap(util.format("Cool, the job '%s' is all set up!\n", job.get('name')), that._wrapOpts));
            rl.close();
        });
    },

    // Edit an existing job.
    edit: function(jobName) {
        this.create(jobName);
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
                out = 'There are no jobs configured. Use "laundry create" to make one.';
            }

            // TODO: Sort list alphabetically, but with "afters" ordered
            jobs.forEach(function(job) {
                var schedule = job.get('schedule');
                if (!isNaN(parseInt(schedule))) {
                    out += util.format('%s runs every %d minutes.', job.get('name'), schedule);
                } else if (schedule.indexOf(':') != -1) {
                    out += util.format('%s runs every day at %s.', job.get('name'), schedule);
                } else if (!schedule) {
                    out += util.format('%s runs manually.', job.get('name'));
                } else {
                    out += util.format('%s runs after another job called %s.', job.get('name'), schedule);
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
    server: function(port) {

    }
});

module.exports = exports = new Laundry();