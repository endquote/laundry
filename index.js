#!/usr/bin/env node

'use strict';

// Loading lots of utiltiies into global.
global._ = require('lodash'); // https://lodash.com/docs
global.ns = require('simple-namespace'); // https://www.npmjs.com/package/simple-namespace
global.fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
global.path = require('path'); // https://nodejs.org/api/path.html
global.async = require('async'); // https://www.npmjs.com/package/async
global.moment = require('moment'); // http://momentjs.com/docs/
global.util = require('util'); // https://nodejs.org/api/util.html
global.validator = require('validator'); // https://www.npmjs.com/package/validator
global.S = require('string'); // http://stringjs.com
global.qs = require('qs'); // https://www.npmjs.com/package/qs
global.extend = require('deep-extend'); // https://www.npmjs.com/package/deep-extend
global.request = require('request'); // https://github.com/request/request
global.commander = require('commander'); // https://www.npmjs.com/package/commander
global.wrap = require('word-wrap'); // https://www.npmjs.com/package/word-wrap
global.JSONbig = require('json-bigint'); // https://www.npmjs.com/package/json-bigint

var processStart = Date.now();
var daemon = false;
var daemonInterval = 60;
var daemonTimeout = null;

// Set up arguments.
commander
    .version(JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version)
    .option('--local [path]', 'path to use for local file storage, default is LAUNDRY_LOCAL', process.env.LAUNDRY_LOCAL)
    .option('--s3key [key]', 'S3 access key ID, default is LAUNDRY_S3_KEY', process.env.LAUNDRY_S3_KEY)
    .option('--s3secret [secret]', 'S3 access key secret, default is LAUNDRY_S3_SECRET', process.env.LAUNDRY_S3_SECRET)
    .option('--s3bucket [bucket]', 'S3 bucket, default is LAUNDRY_S3_BUCKET', process.env.LAUNDRY_S3_BUCKET)
    .option('--baseUrl [url]', 'the base URL that maps to the local folder or S3 bucket, default is LAUNDRY_BASEURL', process.env.LAUNDRY_BASEURL)
    .option('--mediaAge [days]', 'the number of days to keep downloaded media around, default is 30', 30)
    .option('--proxy [proxy]', 'proxy to use for API requests, use "http://localhost:8888" when debugging with Charles')
    .option('-v, --verbose', 'verbose output');

// Set up all the commands.
commander.command('create [job]')
    .description('configure a new job')
    .action(function(job) {
        prepareCommand('create', job);
    });

commander.command('edit [job]')
    .description('edit an existing job')
    .action(function(job) {
        prepareCommand('edit', job);
    });

commander.command('run [job]')
    .description('run an existing job (or "all" to run all jobs)')
    .action(function(job) {
        prepareCommand('run', job);
    });

commander.command('destroy [job]')
    .description('destroy an existing job')
    .action(function(job) {
        prepareCommand('destroy', job);
    });

commander.command('list')
    .description('list configured jobs')
    .action(function() {
        prepareCommand('list');
    });

commander.command('tick')
    .description('run on an interval or cron to trigger scheduled jobs')
    .action(function() {
        prepareCommand('tick');
    });

commander.command('daemon [seconds]')
    .description('run contiuously, calling tick on an interval')
    .action(function(seconds) {
        prepareCommand('daemon', seconds);
    });

commander.parse(process.argv);

// If no command, show help.
if (commander.args.filter(function(arg) {
        return arg.commands;
    }).length === 0) {
    commander.help();
}

function prepareCommand() {

    // Configure logging.
    global.log = require('winston'); // https://github.com/winstonjs/winston
    log.level = 'info';

    // Number of log files to retain for jobs, and for the global log. Could make this a setting.
    log.retainLogs = 30;

    if (commander.verbose) {
        log.level = 'debug';
    }

    log.remove(log.transports.Console);

    // Reduce confusion.
    if (commander.local && (commander.s3key || commander.s3secret || commander.s3bucket)) {
        console.error('Ambiguous: Provide only local or S3 arguments.');
        process.exit(1);
    }

    // Need all of the S3s.
    if (!commander.local && !(commander.s3key && commander.s3secret && commander.s3bucket)) {
        console.error('A local path or S3 key, secret, and bucket must be provided.');
        process.exit(1);
    }

    // Add a slash to baseUrl.
    commander.baseUrl = commander.baseUrl || '';
    if (commander.baseUrl && commander.baseUrl[commander.baseUrl.length - 1] !== '/') {
        commander.baseUrl += '/';
    }

    // All main logic is in this static class.
    global.Laundry = require('./laundry');

    // Load internal classes into the global namespace.
    global.Helpers = require('./helpers');
    global.Job = require('./job');

    // Load washer class files in order of filename length, which also matches the inheritance order.
    global.Washer = require('./washer');
    global.allWashers = {};
    fs.readdirSync(path.join(__dirname, 'washers')).sort(function(a, b) {
        return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
    }).forEach(function(file) {
        file = path.join(__dirname, 'washers', file);
        if (path.extname(file) === '.js') {
            var c = require(file);
            allWashers[c.className] = c;
        }
    });

    // Load item class files in order of filename length, which also matches the inheritance order.
    global.Item = require('./item');
    global.allItems = {};
    fs.readdirSync(path.join(__dirname, 'items')).sort(function(a, b) {
        return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
    }).forEach(function(file) {
        file = path.join(__dirname, 'items', file);
        if (path.extname(file) === '.js') {
            var c = require(file);
            allItems[c.className] = c;
        }
    });

    // Init storage methods.
    global.Storage = require('./storage');
    Storage.init();

    // Determine the command.
    var args = Array.prototype.slice.call(arguments);
    var cmd = args.shift();

    if (cmd === 'daemon') {
        daemon = true;
        daemonInterval = args.shift() || daemonInterval;
        cmd = 'tick';
    }

    args.push(onComplete);

    runCommand(cmd, args);
}


// Load the configuration, then run the command.
function runCommand(cmd, args) {
    Storage.loadConfig(function(err) {
        if (err) {
            onComplete(err);
            return;
        }

        function doCmd() {
            Laundry[cmd].apply(null, args);
        }

        doCmd();
        return;
        /* // currently disabled. it's downloading a 16-bit version that doesn't run on current windows.
        // Update youtube-dl every day.
        if ((cmd === 'run' || cmd === 'tick') && moment().diff(laundryConfig.settings.ytdlupdate, 'hours') >= 24) {
            log.info('Updating youtube-dl');
            var downloader = require('youtube-dl/lib/downloader');
            downloader(function error(err, done) {
                if (err) {
                    log.error(err.stack);
                    doCmd();
                } else {
                    log.info(done);
                    laundryConfig.settings.ytdlupdate = moment();
                    Storage.saveConfig(function(err) {
                        if (err) {
                            onComplete(err);
                            return;
                        }
                        doCmd();
                    });
                }
            });
        } else {
            doCmd();
        }
        */
    });
}

// Perform actions after the command is complete.
function onComplete(err) {
    if (err) {
        log.error(err);
    }

    Storage.flushLogs(function() {
        Storage.clearLog(null, log.retainLogs, function(err) {
            log.debug(Date.now() - processStart + 'ms');

            // In deamon mode, run again in a while.
            if (daemon) {
                setTimeout(function() {
                    runCommand('tick', [onComplete]);
                }, daemonInterval * 1000);
            }
        });
    });
}
