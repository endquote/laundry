#!/usr/bin/env node

'use strict';

var start = Date.now();

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

var AWS = require('aws-sdk');
global.s3 = new AWS.S3();

// Check for S3 config
if (!s3.config.credentials || !process.env.LAUNDRY_S3_BUCKET) {
    console.log('S3 configuration not found. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,\nand LAUNDRY_S3_BUCKET environment variables.');
    return;
}

// Make config folder
var home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
var configFolder = path.join(home, '.laundry');
if (!fs.existsSync(configFolder)) {
    fs.mkdirSync(configFolder);
    fs.mkdirSync(path.join(configFolder, 'logs'));
}
global.configFolder = configFolder;

// Configure logging
global.log = require('winston'); // https://github.com/winstonjs/winston
log.remove(log.transports.Console);
log.add(log.transports.Console, {
    colorize: true
});
log.add(log.transports.DailyRotateFile, {
    filename: path.join(configFolder, 'logs', 'laundry'),
    json: false,
    datePattern: '.yyyy-MM-dd.log',
    maxFiles: 7
});
log.level = 'debug';

// Load internal classes into the global namespace.
global.Helpers = require('./helpers');
global.Job = require('./job');

// Load washer class files in order of filename length, which also matches the inheritance order.
global.Washer = require('./washer');
global.allWashers = {};
fs.readdirSync(path.join(__dirname, 'washers')).sort(function(a, b) {
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}).forEach(function(file) {
    var className = file.replace('.js', '');
    var c = allWashers[className] = require(path.join(__dirname, 'washers', file));
    c.className = className;
});

// Load item class files in order of filename length, which also matches the inheritance order.
global.Item = require('./item');
global.allItems = {};
fs.readdirSync(path.join(__dirname, 'items')).sort(function(a, b) {
    return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}).forEach(function(file) {
    var className = file.replace('.js', '');
    var c = allItems[className] = require(path.join(__dirname, 'items', file));
    c.className = className;
});

// Load all the jobs, all the commands need this anyway.
global.allJobs = [];
fs.readdirSync(configFolder).forEach(function(jobFile) {
    if (path.extname(jobFile) !== '.json') {
        return;
    }
    var json = fs.readFileSync(path.join(configFolder, jobFile));
    try {
        var config = JSON.parse(json);
        if (config.name) {
            allJobs.push(new Job(config));
        }
    } catch (e) {}
});

// Parse arguments
var args = process.argv.slice(2);

var command = '';
if (args.length > 0) {
    command = args.shift().trim().toLowerCase();
}

var arg = '';
if (args.length > 0) {
    arg = args.shift().trim().toLowerCase();
}

// Do stuff
var laundry = require('./laundry');
if (laundry.isCommand(command)) {
    laundry.doCommand(command, arg, onComplete);
} else {
    laundry.help(onComplete);
}

function onComplete() {
    log.debug(Date.now() - start + 'ms');
}
