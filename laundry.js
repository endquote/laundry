'use strict';

var chalk = require('chalk'); // https://github.com/sindresorhus/chalk
var child_process = require('child_process'); // https://nodejs.org/api/child_process.html
var inquirer = require('inquirer'); // https://github.com/sboudrias/Inquirer.js

// Handy global word wrap method.
var oldWrap = global.wrap;
global.wrap = function(s) {
    return oldWrap(s, {
        width: 70
    });
};

// Singleton Laundry class, generally the entry point to the whole thing.
function Laundry() {}

// Create a new job.
Laundry.create = function(jobName, callback) {
    jobName = jobName || '';

    // Convert name to confirm to S3 bucket naming best practices
    jobName = jobName.toLowerCase(); // No capital letters (A-Z)
    jobName = jobName.replace('.', '-'); // No periods (.)
    jobName = jobName.replace('_', '-'); // No underscores (_)
    jobName = jobName.replace(/(^-|-$)/g, ''); // - cannot appear at the beginning nor end of the bucket name
    jobName = jobName.substr(0, 32); // The bucket name must be less than or equal to 32 characters long

    if (!jobName || jobName === 'all') {
        console.log("Specify a name for the job with " + chalk.bold("laundry create [job]") + ".\n");
        Laundry.list(callback);
        return;
    }

    var job;
    var editing = false;

    async.waterfall([

        // Get the job
        function(callback) {
            job = laundryConfig.jobs.filter(function(job) {
                return job && job.name.toLowerCase() === jobName.toLowerCase();
            })[0];
            if (job) {
                editing = true;
                console.log(wrap(util.format("There's already a job called " + chalk.green.bold("%s") + ", so we'll edit it.", jobName)));
                callback();
            } else {
                console.log(wrap(util.format("Great, let's create a new job called " + chalk.green.bold("%s") + ".", jobName)));
                job = new Job({
                    name: jobName
                });
                callback();
            }
        },

        // Ask for the input washer.
        function(callback) {
            console.log(wrap("Now to decide where to launder data from. The sources we have are:"));
            inquirer.prompt(
                [Laundry._washerPrompt(job, 'input')])
                .then(function(answers) {
                    job.input = answers.washer;
                    callback();
                });
        },

        // Configure the input washer.
        function(callback) {
            if (!editing) {
                Laundry._inheritSettings(job.input, 'input');
            }
            Laundry._configureWasher(job, 'input', function() {
                callback();
            });
        },

        // Request the output washer.
        function(callback) {
            console.log(wrap("Now to decide where to send data to. The options we have are:"));
            inquirer.prompt([Laundry._washerPrompt(job, 'output')])
                .then(function(answers) {
                    job.output = answers.washer;
                    callback();
                });
        },

        // Configure the output washer.
        function(callback) {
            if (!editing) {
                Laundry._inheritSettings(job.output, 'output');
            }
            Laundry._configureWasher(job, 'output', function() {
                callback();
            });
        },

        // Configure scheduling.
        function(callback) {
            Laundry._scheduleJob(job, function(err) {
                callback();
            });
        }

    ], function(err) {
        if (err) {
            callback(err);
        } else if (job) {
            job.lastRun = null;
            if (laundryConfig.jobs.indexOf(job) === -1) {
                laundryConfig.jobs.push(job);
            }
            Storage.saveConfig(function(err) {
                if (err) {
                    callback(err);
                    return;
                }
                console.log(chalk.green(wrap(util.format("Cool, the job " + chalk.bold("%s") + " is all set up!\n", job.name))));
                callback();
            });
        }
    });
};

// Build the prompt object for asking which washer to use.
Laundry._washerPrompt = function(job, mode) {

    // Get all of the washers with input or output, as requested.
    var validWashers = [];
    for (var i in allWashers) {
        var w = new allWashers[i](null, job);
        if (w[mode] && w.name) {

            // Use the existing washer if there is one.
            if (job[mode] && job[mode].className === w.className) {
                w = job[mode];
            }

            validWashers.push(w);
        }
    }

    // Sort by name.
    validWashers.sort(function(a, b) {
        return a.name === b.name ? 0 : a.name < b.name ? -1 : 1;
    });

    // Make choice labels.
    var choices = validWashers.map(function(washer) {
        return {
            value: washer,
            name: washer.name + ' - ' + washer[mode].description,
        };
    });

    var prompt = {
        type: 'list',
        name: 'washer',
        message: ' ',
        pageSize: 10,
        choices: choices
    };

    // Default to the current washer.
    prompt.default = choices.indexOf(choices.filter(function(choice) {
        return choice.value === job[mode];
    })[0]);

    if (prompt.default === -1) {
        prompt.default = choices.indexOf(choices.filter(function(c) {
            return c.value._isDefaultWasher;
        })[0]);
    }

    return prompt;
};

// Given an input or output washer, find other jobs using a similar one and inherit settings from it.
Laundry._inheritSettings = function(washer, mode) {
    var washerClass = washer.className;

    // Collect the base classes that the washer inherits from.
    var baseClasses = [];
    while (washerClass.indexOf('.') !== -1) {
        washerClass = washerClass.substr(0, washerClass.lastIndexOf('.'));
        baseClasses.push(washerClass);
    }
    baseClasses.pop();

    if (baseClasses.length === 0) {
        baseClasses = [washer.className];
    }

    // Collect the settings in those base classes.
    var settings = ['token'];
    baseClasses.forEach(function(baseClass) {
        if (!allWashers[baseClass]) {
            return;
        }
        var w = new allWashers[baseClass]();
        if (w[mode] && w[mode].prompts) {
            w[mode].prompts.forEach(function(setting) {
                if (settings.indexOf(setting.name) === -1) {
                    settings.push(setting.name);
                }
            });
        }
    });

    // Collect the jobs which use this same washer or any of its base classes.
    var relatedJobs = laundryConfig.jobs.filter(function(job) {
        var jobClass = job[mode].className;
        return baseClasses.filter(function(baseClass) {
            return jobClass.indexOf(baseClass) !== -1;
        }).length;
    });

    // Merge settings from the related job into this new washer.
    relatedJobs.forEach(function(job) {
        settings.forEach(function(setting) {
            washer[setting] = job[mode][setting];
        });
    });
};

// Given a washer and an input/output mode, configure settings on the washer.
Laundry._configureWasher = function(job, mode, callback) {
    var washer = job[mode];
    var prompts = washer[mode].prompts;
    if (!prompts || !prompts.length) {
        callback();
        return;
    }

    prompts.forEach(function(prompt) {
        if (washer[prompt.name]) {
            prompt.default = washer[prompt.name];
        }

        prompt.message = prompt.message || ':';
        prompt.message += ':';

        prompt.validate = prompt.validate || function(value, answers) {
            return !validator.isWhitespace(value);
        };

        prompt.type = prompt.type || 'input';

        if (prompt.setup) {
            prompt.setup(job);
        }
    });

    inquirer.prompt(prompts)
        .then(function(answers) {
            for (var i in answers) {
                washer[i] = answers[i];
            }
            callback();
        });
};

Laundry._scheduleType = function(schedule) {
    if (schedule) {
        schedule = schedule.toString();
    }

    if (!schedule) {
        // Run manually.
        return 'manual';
    } else if (schedule.indexOf(':') !== -1) {
        // Run at a time of day.
        return 'timed';
    } else if (!isNaN(parseInt(schedule))) {
        // Run on an interval.
        return 'interval';
    } else {
        // Run after another job.
        return 'after';
    }
};

Laundry._scheduleJob = function(job, callback) {
    var prompt = '';
    prompt += "Now to set when this job will run.\n";
    prompt += "- Leave blank to run only when 'laundry run [job]' is called.\n";
    prompt += "- Enter a number to run after so many minutes. Entering 60 will run the job every hour.\n";
    prompt += "- Enter a time to run at a certain time every day, like '9:30' or '13:00'.\n";
    prompt += "- Enter the name of another job to run after that job runs.";
    console.log("\n" + wrap(prompt));

    inquirer.prompt([{
        type: 'input',
        name: 'schedule',
        prompt: 'Schedule',
        default: job.schedule,
        message: 'How do you want the job to be scheduled?',
        validate: function(value) {
            var valid = false;
            var type = Laundry._scheduleType(value);
            if (type === 'manual') {
                valid = true;
            } else if (type === 'timed') {
                var time = moment({
                    hour: value.split(':')[0],
                    minute: value.split(':')[1]
                });
                valid = time.isValid();
            } else if (type === 'interval') {
                valid = parseInt(value) > 0;
            } else if (type === 'after') {
                if (value !== job.name.toLowerCase()) {
                    laundryConfig.jobs.forEach(function(job) {
                        if (job.name.toLowerCase() === value) {
                            valid = true;
                        }
                    });
                }
            }
            return valid;
        },
        filter: function(value) {
            var type = Laundry._scheduleType(value);
            if (type === 'manual') {
                value = value;
            } else if (type === 'timed') {
                var time = moment({
                    hour: value.split(':')[0],
                    minute: value.split(':')[1]
                });
                value = time.format('HH:mm');
            } else if (type === 'interval') {
                value = parseInt(value);
            } else if (type === 'after') {
                if (value !== job.name.toLowerCase()) {
                    laundryConfig.jobs.forEach(function(job) {
                        if (job.name.toLowerCase() === value) {
                            value = job.name;
                        }
                    });
                }
            }
            return value;
        }
    }]).then(function(answers) {
        job.schedule = answers.schedule;
        var type = Laundry._scheduleType(job.schedule);
        if (type === 'manual') {
            console.log(wrap(util.format("This job will only be run manually.")));
        } else if (type === 'timed') {
            console.log(wrap(util.format("This job will run every day at %s.", job.schedule)));
        } else if (type === 'interval') {
            console.log(wrap(util.format("This job will run every %d minutes.", job.schedule)));
        } else if (type === 'after') {
            console.log(wrap(util.format("This job will run after the job " + chalk.bold("%s") + ".", job.schedule)));
        }
        callback();
    });
};

// Edit an existing job.
Laundry.edit = function(jobName, callback) {
    if (!jobName) {
        console.log("Specify a job to edit with " + chalk.bold("laundry edit [job]") + ".\n");
        Laundry.list(callback);
        return;
    }

    Laundry.create(jobName, callback);
};

// Run a job.
Laundry.run = function(jobName, callback) {
    if (!jobName) {
        console.log("Specify a job to run with " + chalk.bold("laundry run [job]") + ".\n");
        Laundry.list(callback);
        return;
    }

    async.waterfall([

        // Find the requested job.
        function(callback) {

            // run() is calling itself with chained jobs.
            if (_.isArray(jobName)) {
                callback(null, jobName);
                return;
            }

            jobName = jobName.toLowerCase();

            // If all jobs, select everything that isn't scheduled to run after something else.
            if (jobName === 'all') {
                var runJobs = laundryConfig.jobs.filter(function(job1) {
                    return laundryConfig.jobs.filter(function(job2) {
                        return job1.schedule.toString().toLowerCase() === job2.name.toLowerCase();
                    }).length === 0;
                });
                callback(null, runJobs);
                return;
            }

            var job = laundryConfig.jobs.filter(function(job) {
                return job.name.toLowerCase() === jobName;
            })[0];
            if (!job) {
                console.log("Job " + chalk.red.bold(jobName) + " was not found.\n");
                Laundry.list();
                callback(jobName);
            } else {
                callback(null, [job]);
            }
        },

        // Run all the jobs
        function(jobs, callback) {

            async.eachSeries(jobs, function(job, callback) {
                async.waterfall([

                    // Set up the logger for the job.
                    function(callback) {
                        Storage.initLog(job);
                        callback();
                    },

                    // Do the job's input task.
                    function(callback) {
                        log.info(job.name + "/" + job.input.name + " - input");
                        job.input.doInput(function(err, items) {
                            callback(err, job, items);
                        });
                    },

                    // Do the job's output task.
                    function(job, items, callback) {
                        log.info(job.name + "/" + job.output.name + " - output");
                        if (!items || !items.length) {
                            callback(null, job);
                        } else {
                            job.output.doOutput(items, function(err) {
                                callback(err, job);
                            });
                        }
                    }
                ], function(err, job) {
                    if (!err) {
                        job.lastRun = new Date();
                        Storage.clearLog(job, log.retainLogs, function() {
                            Storage.saveConfig(function() {
                                log.info(job.name + " - complete");
                                callback(null, job);
                            });
                        });
                    } else {
                        log.error(job.name + " - error: " + util.inspect(err, {
                            depth: 99
                        }));
                        callback(null, job);
                    }
                });
            }, function(err) {
                callback(err, jobs);
            });
        }
    ], function(err, jobs) {

        // Find any jobs that are scheduled to run after jobs which just ran.
        var runJobs = [];
        if (jobs) {
            jobs.forEach(function(ranJob) {
                runJobs = runJobs.concat(laundryConfig.jobs.filter(function(job) {
                    return job.schedule === ranJob.name;
                }));
            });
        }

        if (runJobs.length) {
            Laundry.run(runJobs, callback);
        } else if (callback) {
            callback(err);
        }
    });
};

// Destroy a job.
Laundry.destroy = function(jobName, callback) {
    if (!jobName) {
        console.log("Specify a job to edit with " + chalk.bold("laundry destroy [job]") + ".\n");
        Laundry.list(callback);
        return;
    }

    // Find the requested job.
    var job = laundryConfig.jobs.filter(function(j) {
        return j.name.toLowerCase() === jobName.toLowerCase();
    })[0];

    if (!job) {
        console.log("Job " + chalk.red.bold(jobName) + " was not found.\n");
        Laundry.list();
        callback();
        return;
    }

    // Confirm and destroy.
    inquirer.prompt([{
        type: 'input',
        name: 'job',
        message: util.format("Are you sure you want to destroy the job " + chalk.bold("%s") + "? Enter the job name again to confirm.", job.name)
    }]).then(function(answers) {
        var answer = answers.job;
        if (answer === job.name.toLowerCase() && answer === jobName.toLowerCase()) {

            async.waterfall([
                // Get any media files in this job.
                function(callback) {
                    var prefix = Item.buildPrefix(job.name);
                    Storage.cacheFiles(log, prefix, callback);
                },
                // Delete media files.
                function(cache, callback) {
                    Storage.deleteBefore(log, cache, new Date(), callback);
                },
                // Delete the job from the config.
                function(callback) {
                    laundryConfig.jobs.splice(laundryConfig.jobs.indexOf(job), 1);
                    Storage.saveConfig(callback);
                },
                // Tell the user about it.
                function(url, callback) {
                    console.log(wrap(util.format(chalk.red("Job " + chalk.bold("%s") + " destroyed."), job.name)) + "\n");
                    callback();
                }
            ], function(err) {
                callback(err);
            });

        } else {
            console.log(wrap(util.format(chalk.green("Job " + chalk.bold("%s") + " saved."), job.name)) + "\n");
            callback();
        }
    });
};

// List current jobs.
Laundry.list = function(callback) {
    var out = 'Current jobs: \n';

    if (!laundryConfig.jobs.length) {
        out = 'There are no jobs configured. Use "laundry create" to make one.';
    }

    laundryConfig.jobs.forEach(function(job) {
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

            if (job.lastRun && job.lastRun.format) {
                out += util.format(' Last run %s.', job.lastRun.format('l LTS'));
            }

            out += '\n';
        }
    });

    console.log(out);
    if (callback) {
        callback();
    }
};

// Run jobs according to their schedule.
Laundry.tick = function(callback) {
    var now = moment();

    async.waterfall([

        // Get the jobs that are due to run on schedule
        function(callback) {

            var jobs = laundryConfig.jobs.filter(function(job) {
                if (!job.schedule) {
                    // job runs manually
                    return false;
                }

                if (!job.lastRun) {
                    // job has a schedule but has never run, so run it
                    return true;
                }

                if (typeof(job.schedule) === 'number') {
                    // every n minutes
                    return now.diff(job.lastRun, 'minutes') >= job.schedule;

                } else if (job.schedule.indexOf(':') !== -1) {
                    // after a specific time
                    var lastIdealRun = moment(job.lastRun);
                    lastIdealRun.minute(job.schedule.split(':')[0]);
                    lastIdealRun.hour(job.schedule.split(':')[1]);
                    return now.diff(lastIdealRun, 'days') >= 1;
                }

                return false;
            });

            callback(null, jobs);
        },

        // Run the jobs
        function(jobs, callback) {
            async.eachSeries(jobs, function(job, callback) {
                Laundry.run(job.name, callback);
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
        if (callback) {
            callback();
        }
    });
};

module.exports = Laundry;
