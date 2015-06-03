#!/usr/bin/env node

var args = process.argv.slice(2);

var command = '';
if (args.length > 0) {
    command = args.shift().trim().toLowerCase();
}

var job = '';
if (args.length > 0) {
    job = args.shift().trim().toLowerCase();
}

var laundry = require('./laundry');

if (laundry.isCommand(command)) {
    laundry.doCommand(command, job);
} else {
    laundry.help();
}