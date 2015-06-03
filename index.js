#!/usr/bin/env node

var fs = require('fs'); // https://nodejs.org/api/fs.html
var path = require('path'); // https://nodejs.org/api/path.html
var log = require('winston'); // https://github.com/winstonjs/winston

// Configure logging
log.remove(log.transports.Console);
log.add(log.transports.Console, {
    colorize: true
});
log.level = 'debug';

// Parse arguments
var args = process.argv.slice(2);

var command = '';
if (args.length > 0) {
    command = args.shift().trim().toLowerCase();
}

var job = '';
if (args.length > 0) {
    job = args.shift().trim().toLowerCase();
}

// Make config folder
var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var configFolder = path.join(home, '.laundry');
if (!fs.existsSync(configFolder)) {
    fs.mkdirSync(configFolder);
}
global.$$configFolder = configFolder;

// Do stuff
var laundry = require('./laundry');

if (laundry.isCommand(command)) {
    laundry.doCommand(command, job);
} else {
    laundry.help();
}