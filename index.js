#!/usr/bin/env node

'use strict';

var processStart = Date.now();

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

// Load internal classes into the global namespace.
global.Helpers = require('./helpers');
global.Job = require('./job');

global.Storage = require('./storage');
require('./storage/local');

// Configure logging.
global.log = require('winston'); // https://github.com/winstonjs/winston
log.level = 'info';
log.remove(log.transports.Console);
log.add(log.transports.Console, {
    colorize: true
});

// All main logic is in this static class.
global.Laundry = require('./laundry');

// Load washer class files in order of filename length, which also matches the inheritance order.
global.Washer = require('./washer');
global.allWashers = {};
fs.readdirSync(path.join(__dirname, 'washers')).sort(function(a, b) {
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}).forEach(function(file) {
    var c = require(path.join(__dirname, 'washers', file));
    allWashers[c.className] = c;
});

// Load item class files in order of filename length, which also matches the inheritance order.
global.Item = require('./item');
global.allItems = {};
fs.readdirSync(path.join(__dirname, 'items')).sort(function(a, b) {
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}).forEach(function(file) {
    var c = require(path.join(__dirname, 'items', file));
    allItems[c.className] = require(path.join(__dirname, 'items', file));
});

global.allJobs = [];

// Set up arguments.
commander
    .version(JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version)
    .option('--local [path]', 'path to use for local file storage, default is LAUNDRY_LOCAL', process.env.LAUNDRY_LOCAL)
    .option('--s3key [key]', 'S3 access key ID, default is LAUNDRY_S3_KEY', process.env.LAUNDRY_S3_KEY)
    .option('--s3secret [secret]', 'S3 access key secret, default is LAUNDRY_S3_SECRET', process.env.LAUNDRY_S3_SECRET)
    .option('--s3bucket [bucket]', 'S3 bucket, default is LAUNDRY_S3_BUCKET', process.env.LAUNDRY_S3_BUCKET)
    .option('--proxy [proxy]', 'proxy to use for API requests')
    .option('-v, --verbose', 'verbose output', function(v) {
        log.level = 'debug';
    });

// Set up all the commands.
commander.command('create [job]')
    .description('configure a new job')
    .action(function(job) {
        runCommand(Laundry.create, job);
    });

commander.command('edit [job]')
    .description('edit an existing job')
    .action(function(job) {
        runCommand(Laundry.edit, job);
    });

commander.command('run [job]')
    .description('run an existing job (or "all" to run all jobs)')
    .action(function(job) {
        runCommand(Laundry.run, job);
    });

commander.command('destroy [job]')
    .description('destroy an existing job')
    .action(function(job) {
        runCommand(Laundry.destroy, job);
    });

commander.command('list')
    .description('list configured jobs')
    .action(function() {
        runCommand(Laundry.list);
    });

commander.command('tick')
    .description('run on an interval or cron to trigger scheduled jobs')
    .action(function() {
        runCommand(Laundry.tick);
    });

commander.parse(process.argv);

// If no command, show help.
if (commander.args.filter(function(arg) {
    return arg.commands;
}).length === 0) {
    commander.help();
}

function runCommand() {
    var args = Array.prototype.slice.call(arguments);
    var cmd = args.shift();
    args.push(onComplete);
    Storage.loadConfig(function(err) {
        if (err) {
            onComplete(err);
            return;
        }
        cmd.apply(null, args);
    });
}

// Output execution time.
function onComplete(err) {
    if (err) {
        log.error(err);
    }
    log.debug(Date.now() - processStart + 'ms');
}
