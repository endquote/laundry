'use strict';

var readline = require('readline'); // https://nodejs.org/api/readline.html
var wrap = require('word-wrap'); // https://www.npmjs.com/package/word-wrap
var chalk = require('chalk'); // https://github.com/sindresorhus/chalk

var Washer = require('./washer');
var Job = require('./job');

// Singleton Laundry class, generally the entry point to the whole thing.
function Laundry() {

    // Valid commands and their descriptions.
    this._commands = {
        'create': 'create -- configure a new job',
        'edit': 'edit -- edit the configuration of an existing job',
        'run': 'run [job] -- run an existing job',
        'destroy': 'destroy -- destroy an existing job',
        'list': 'list -- list configured jobs',
        'tick': 'tick -- run on an interval to run scheduled jobs',
        'server': 'server [port] -- run continuously and serve up generated static content',
        'version': 'version -- output version info',
        'help': 'help -- this help text'
    };

    // Options to pass to the word wrap method.
    this._wrapOpts = {
        width: 70
    };
}

// Is the command you're trying to run a real command?
Laundry.prototype.isCommand = function(command) {
    return command && this._commands[command.trim().toLowerCase()] !== null;
};

// Run a command.
Laundry.prototype.doCommand = function(command, job) {
    if (!this.isCommand(command)) {
        return false;
    }

    if (job) {
        return this[command.trim().toLowerCase()](job);
    } else {
        return this[command.trim().toLowerCase()]();
    }
};

// Output version info.
Laundry.prototype.version = function() {
    var p = require('./package.json');
    var docs = '';
    docs += '\nLaundry version ' + p.version + '\n';
    console.log(docs);
};

// Output help text.
Laundry.prototype.help = function() {
    this.version();
    var p = require('./package.json');
    var docs = '';
    docs += 'The available commands for laundry are as follows: \n\n';
    for (var i in this._commands) {
        docs += 'laundry ' + this._commands[i] + '\n';
    }

    docs += '\nFor more info see ' + p.homepage + '\n';
    console.log(docs);
};

// Create a new job.
Laundry.prototype.create = function(jobName) {
    var that = this;
    var validWashers = [];
    var allJobs = [];

    async.waterfall([

        // Get all the jobs, for scheduling.
        function(callback) {
            Job.getAllJobs(function(jobs) {
                allJobs = jobs;
                callback();
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
                        return washer.name;
                    });
                    completions.sort();
                    completions = completions.filter(function(completion) {
                        return completion.toLowerCase().indexOf(line) !== -1;
                    });
                    return [completions, line];
                }
            });

            callback(null, rl);
        },

        // Get a name for the job.
        function(rl, callback) {
            async.whilst(function() {
                    return !jobName;
                },
                function(callback) {
                    rl.question(wrap("What do you want to call this job? ", that._wrapOpts), function(answer) {
                        jobName = chalk.stripColor(answer).trim();
                        if (!jobName) {
                            rl.write(wrap(chalk.red("That's not a valid name. Try again?\n"), that._wrapOpts));
                        }
                        callback();
                    });
                }, function(err) {
                    callback(err, rl, jobName);
                });
        },

        // Get the job
        function(rl, jobName, callback) {
            var job = allJobs.filter(function(job) {
                return job && job.name.toLowerCase() === jobName.toLowerCase();
            })[0];
            if (job) {
                rl.write(wrap(util.format("There's already a job called " + chalk.green.bold("%s") + ", so we'll edit it.\n", jobName), that._wrapOpts));
                callback(null, rl, job);
            } else {
                rl.write(wrap(util.format("Great, let's create a new job called " + chalk.green.bold("%s") + ".\n", jobName), that._wrapOpts));
                job = new Job({
                    name: jobName
                });
                callback(null, rl, job);
            }
        },

        // A: Get all the washers and filter by the ones that support input.
        function(rl, job, callback) {
            Washer.getAllWashers(function(washers) {
                validWashers = washers.filter(function(washer) {
                    return washer.input;
                });
                callback(null, rl, job);
            });
        },

        // B: Ask for the input washer.
        function(rl, job, callback) {
            var washersList = '';
            validWashers.forEach(function(washer) {
                washersList += util.format(chalk.bold("%s") + " - %s\n", washer.name, washer.input.description);
            });

            var list = util.format("Now to decide where to launder data from. The sources we have are:\n%s\n", washersList);
            rl.write("\n" + wrap(list, that._wrapOpts));

            var washer = null;
            async.whilst(function() {
                    return washer === null;
                }, function(callback) {
                    rl.question(wrap("Which source do you want to use? ", that._wrapOpts), function(answer) {
                        answer = chalk.stripColor(answer).trim();
                        washer = validWashers.filter(function(washer) {
                            return washer.name.toLowerCase() === answer.toLowerCase();
                        })[0];
                        if (washer) {
                            rl.write(wrap(util.format("Cool, we'll start with " + chalk.green.bold("%s") + ".\n", washer.name), that._wrapOpts));
                            if (!job.input || job.input.name !== washer.name) {
                                job.input = washer;
                            }
                        } else {
                            rl.write(wrap(chalk.red("Hm, couldn't find that one. Try again?\n"), that._wrapOpts));
                        }
                        callback();
                    });
                    if (job.input) {
                        rl.write(job.input.name);
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
            var washer = job.input;
            async.eachSeries(washer.input.settings, function(item, callback) {
                var valid = false;
                async.whilst(function() {
                        return !valid;
                    },
                    function(callback) {
                        rl.question(wrap(item.prompt + ' ', that._wrapOpts), function(answer) {
                            Washer.validateField(item.type, answer, function(a) {
                                answer = a;
                                valid = answer;
                                if (valid) {
                                    washer[item.name] = answer;
                                } else {
                                    rl.write(wrap(chalk.red("That's not a valid answer. Try again?\n"), that._wrapOpts));
                                }
                                callback();
                            });
                        });
                        rl.write(washer[item.name]);
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
                    return washer.output;
                });
                callback(null, rl, job);
            });
        },

        // B: Request the output washer.
        function(rl, job, callback) {
            var washersList = '';
            validWashers.forEach(function(washer) {
                washersList += util.format(chalk.bold("%s") + " - %s", washer.name, washer.output.description);
            });

            var list = util.format("Now to decide where to send data to. The options we have are:\n%s\n\n", washersList);
            rl.write("\n" + wrap(list, that._wrapOpts));

            var washer = null;
            async.whilst(function() {
                    return washer === null;
                }, function(callback) {
                    rl.question(wrap("Which target do you want to use? ", that._wrapOpts), function(answer) {
                        answer = chalk.stripColor(answer).trim();
                        washer = validWashers.filter(function(washer) {
                            return washer.name.toLowerCase() === answer.toLowerCase();
                        })[0];
                        if (washer) {
                            rl.write(wrap(util.format("Cool, we'll send it to " + chalk.green.bold("%s") + ".\n", washer.name), that._wrapOpts));
                            if (!job.output || job.output.name !== washer.name) {
                                job.output = washer;
                            }
                        } else {
                            rl.write(wrap(chalk.red("Hm, couldn't find that one. Try again?\n"), that._wrapOpts));
                        }
                        callback();
                    });
                    if (job.output) {
                        rl.write(job.output.name);
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
            var washer = job.output;
            async.eachSeries(washer.output.settings, function(item, callback) {
                var valid = false;
                async.whilst(function() {
                        return !valid;
                    },
                    function(callback) {
                        rl.question(wrap(item.prompt + ' ', that._wrapOpts), function(answer) {
                            Washer.validateField(item.type, answer, function(a) {
                                answer = a;
                                valid = answer;
                                if (valid) {
                                    washer[item.name] = answer;
                                } else {
                                    rl.write(wrap(chalk.red("That's not a valid answer. Try again?\n"), that._wrapOpts));
                                }
                                callback();
                            });
                        });
                        rl.write(washer[item.name]);
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
            prompt += "Now to set when this job will run.\n";
            prompt += "- Leave blank to run only when 'laundry run [job]' is called.\n";
            prompt += "- Enter a number to run after so many minutes. Entering 60 will run the job every hour.\n";
            prompt += "- Enter a time to run at a certain time every day, like '9:30' or '13:00'.\n";
            prompt += "- Enter the name of another job to run after that job runs.\n\n";
            rl.write("\n" + wrap(prompt, that._wrapOpts));

            var valid = false;
            async.whilst(function() {
                    return !valid;
                },
                function(callback) {
                    rl.question(wrap("How do you want the job to be scheduled? ", that._wrapOpts), function(answer) {
                        answer = chalk.stripColor(answer).trim().toLowerCase();

                        if (!answer) {
                            valid = true;
                            rl.write(wrap(util.format("This job will only be run manually.\n"), that._wrapOpts));
                        } else if (answer.indexOf(':') !== -1) {
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
                            if (answer !== job.name.toLowerCase()) {
                                allJobs.forEach(function(job) {
                                    if (job.name.toLowerCase() === answer) {
                                        valid = true;
                                        answer = job.name;
                                        rl.write(wrap(util.format("This job will run after the job " + chalk.bold("%s") + ".\n", answer), that._wrapOpts));
                                    }
                                });
                            }
                        }

                        if (valid) {
                            job.schedule = answer;
                        } else {
                            rl.write(wrap(chalk.red("That's not a valid answer. Try again?\n"), that._wrapOpts));
                        }
                        callback();
                    });
                    if (job.schedule) {
                        rl.write(job.schedule.toString());
                    }
                }, function(err) {
                    callback(err, rl, job);
                });
        }

        // TODO: (1) Set filters
    ], function(err, rl, job) {
        if (!err && job) {
            job.save();
        }

        rl.write("\n" + chalk.green(wrap(util.format("Cool, the job " + chalk.bold("%s") + " is all set up!\n", job.name), that._wrapOpts)));
        rl.close();
    });
};

// Edit an existing job.
Laundry.prototype.edit = function(jobName) {
    if (!jobName) {
        console.log("Specify a job to edit with " + chalk.bold("laundry edit [job]") + ".\n");
        this.list();
        return;
    }

    this.create(jobName);
};

// Run a job.
Laundry.prototype.run = function(jobName, callback) {
    if (!jobName) {
        console.log("Specify a job to run with " + chalk.bold("laundry run [job]") + ".\n");
        this.list();
        return;
    }

    var that = this;
    var allJobs = null;
    async.waterfall([

            // Get all jobs.
            function(callback) {
                Job.getAllJobs(function(jobs) {
                    allJobs = jobs;
                    callback();
                });
            },

            // Find the requested job.
            function(callback) {
                var job = allJobs.filter(function(job) {
                    return job.name.toLowerCase() === jobName.toLowerCase();
                })[0];
                if (!job) {
                    console.log("Job " + chalk.red.bold(jobName) + " was not found.\n");
                    that.list();
                    callback(jobName);
                } else {
                    callback(null, job);
                }
            },

            // Add any jobs which are scheduled to run after others.
            function(job, callback) {
                var runJobs = [job];
                var foundJobs = false;
                do {
                    foundJobs = false;
                    var runJobNames = runJobs.map(function(job, index, a) {
                        return job.name.toLowerCase();
                    }); // jshint ignore:line
                    allJobs.forEach(function(job) {
                        if (runJobs.indexOf(job) === -1) {
                            var name = job.schedule ? job.schedule.toString() : '';
                            name = name.toLowerCase();
                            var index = runJobNames.indexOf(name);
                            if (index !== -1) {
                                runJobs.splice(index + 1, 0, job);
                                foundJobs = true;
                            }
                        }
                    }); // jshint ignore:line
                } while (foundJobs);
                callback(null, runJobs);
            },

            // Run all the jobs
            function(jobs, callback) {
                async.eachSeries(jobs, function(job, callback) {
                    async.waterfall([

                        function(callback) {
                            log.info(job.name + "/" + job.input.name + " - input");
                            job.input.doInput(function(err, items) {
                                callback(err, job, items);
                            });
                        },

                        function(job, items, callback) {
                            log.info(job.name + "/" + job.output.name + " - output");
                            job.output.doOutput(items, function(err) {
                                callback(err, job);
                            });
                        }
                    ], function(err, job) {
                        if (!err) {
                            job.lastRun = new Date();
                            job.save();
                            log.info(job.name + " - complete");
                        } else {
                            log.error(job.name + " - error: " + err);
                        }

                        callback(err, job);
                    });
                }, function(err) {
                    callback(err);
                });
            }
        ],
        function(err) {
            if (callback) {
                callback(err);
            }
        });
};

// Destroy a job.
Laundry.prototype.destroy = function(jobName) {
    if (!jobName) {
        console.log("Specify a job to edit with " + chalk.bold("laundry destroy [job]") + ".\n");
        this.list();
        return;
    }

    var that = this;
    var job = null;

    async.waterfall([

            // Find the requested job.
            function(callback) {
                Job.getJob(jobName, function(job) {
                    if (!job) {
                        console.log("Job " + chalk.red.bold(jobName) + " was not found.\n");
                        that.list();
                        callback(jobName);
                    } else {
                        callback(null, job);
                    }
                });
            },

            // Set up the console.
            function(job, callback) {
                var rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                callback(null, rl, job);
            },

            // Confirm and destroy.
            function(rl, job, callback) {
                rl.question(wrap(util.format("Are you sure you want to destroy the job " + chalk.bold("%s") + "? Enter the job name again to confirm.", job.name), that._wrapOpts) + "\n", function(answer) {
                    answer = chalk.stripColor(answer).trim().toLowerCase();
                    if (answer === job.name.toLowerCase() && answer === jobName.toLowerCase()) {
                        job.del(function(err) {
                            rl.write(wrap(util.format(chalk.red("Job " + chalk.bold("%s") + " destroyd."), job.name), that._wrapOpts) + "\n");
                            callback(err, rl);
                        });
                    } else {
                        rl.write(wrap(util.format(chalk.green("Job " + chalk.bold("%s") + " saved."), job.name), that._wrapOpts) + "\n");
                        callback(null, rl);
                    }
                });
            }
        ],
        function(err, rl) {
            if (rl) {
                rl.write("\n");
                rl.close();
            }
        });
};

// List current jobs.
Laundry.prototype.list = function() {
    var out = 'Current jobs: \n';

    Job.getAllJobs(function(jobs) {
        if (!jobs.length) {
            out = 'There are no jobs configured. Use "laundry create" to make one.';
        }

        // TODO: Sort list alphabetically, but with "afters" ordered
        jobs.forEach(function(job) {
            if (job) {
                var schedule = job.schedule;
                if (typeof schedule === 'number') {
                    out += util.format(chalk.bold("%s") + " runs every %d minutes.", job.name, schedule);
                } else if (!schedule) {
                    out += util.format(chalk.bold("%s") + " runs manually.", job.name);
                } else if (schedule.indexOf(':') !== -1) {
                    out += util.format(chalk.bold("%s") + " runs every day at %s.", job.name, schedule);
                } else {
                    out += util.format(chalk.bold("%s") + " runs after another job called %s.", job.name, schedule);
                }
                out += '\n';
            }
        });

        console.log(out);
    });
};

// Run jobs according to their schedule.
Laundry.prototype.tick = function() {
    var now = moment();
    var that = this;

    async.waterfall([

        // Get all the jobs
        function(callback) {
            Job.getAllJobs(function(jobs) {
                callback(null, jobs);
            });
        },

        // Get the jobs that are due to run on schedule
        function(jobs, callback) {

            jobs = jobs.filter(function(job) {
                if (!job.schedule) {
                    return false;
                }

                if (typeof(job.schedule) === 'number') {
                    // every n minutes
                    return !job.lastRun || now.diff(job.lastRun, 'minutes') >= job.schedule;

                } else if (job.schedule.indexOf(':') !== -1) {
                    // after a specific time
                    var time = moment({
                        hour: job.schedule.split(':')[0],
                        minute: job.schedule.split(':')[1]
                    });
                    return now.isAfter(time) && (!job.lastRun || now.diff(job.lastRun, 'days') >= 1);
                }

                return false;
            });

            callback(null, jobs);
        },

        // Run the jobs
        function(jobs, callback) {
            async.eachSeries(jobs, function(job, callback) {
                that.run(job.name, callback);
            }, function(err) {
                if (!jobs.length) {
                    log.info('No jobs to run.');
                }
                callback(err);
            });
        }
    ], function(err) {
        if (err) {
            log.error(err);
        }
    });
};

// Run continuously and serve up generated static content.
Laundry.prototype.server = function(port) {

};

module.exports = exports = new Laundry();