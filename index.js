#!/usr/bin/env node

'use strict';

var start = Date.now();
global._ = require('lodash'); // https://lodash.com/docs
global.ns = require('simple-namespace'); // https://www.npmjs.com/package/simple-namespace
global.fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
global.path = require('path'); // https://nodejs.org/api/path.html
global.async = require('async'); // https://www.npmjs.com/package/async
global.moment = require('moment'); // http://momentjs.com/docs/
global.util = require('util'); // https://nodejs.org/api/util.html
global.validator = require('validator'); // https://www.npmjs.com/package/validator
global.S = require('string'); // http://stringjs.com


// Load internal classes into the global namespace. (Is this totally bad form?)
global.Helpers = require('./helpers');
global.Job = require('./job');

// Washer class files specified in order of inheritance
global.Washer = require('./washer');
var washerFiles = [
    'rss.js',
    'google.js',
    'google.youtube.js',
    'google.youtube.subscriptions.js',
    'google.youtube.channel.js',
    'instagram.js',
    'instagram.timeline.js',
    'instagram.user.js',
    'instagram.tag.js',
    'instagram.likes.js',
    'tumblr.js',
    'tumblr.dashboard.js'
];
global.allWashers = {};
washerFiles.forEach(function(file) {
    allWashers[file.replace('.js', '')] = require(path.join(__dirname, 'washers', file));
});

// Item class files specified in order of inheritance
global.Item = require('./item');
var itemFiles = [
    'rss.js',
    'google.youtube.video.js',
    'instagram.media.js',
    'tumblr.post.js'
];
global.allItems = {};
itemFiles.forEach(function(file) {
    allItems[file.replace('.js', '')] = require(path.join(__dirname, 'items', file));
});

// Make config folder
var home = process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
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
    maxFiles: 90
});
log.level = 'debug';

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