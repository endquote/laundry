// singleton Laundry class.

function Laundry() {}

Laundry.prototype.commands = {
    'create': 'create [job] -- configure a new job',
    'edit': 'edit [job] -- edit the configuration of an existing job',
    'run': 'run [job] -- run an existing job',
    'delete': 'delete [job] -- delete an existing job',
    'list': 'list [job] -- list configured jobs',
    'tick': 'tick -- run on an interval to execute scheduled jobs',
    'version': 'version -- output version info',
    'help': 'help -- this help text'
};

Laundry.prototype.isCommand = function(command) {
    return this.commands[command.trim().toLowerCase()] != null;
}

Laundry.prototype.doCommand = function(command, job) {
    if (!this.isCommand(command)) {
        return false;
    }

    return this[command.trim().toLowerCase()](job);
}

Laundry.prototype.version = function() {
    var package = require('./package.json');
    var docs = '';
    docs += '\nLaunder version ' + package.version + '\n';
    console.log(docs);
}

Laundry.prototype.help = function() {
    this.version();
    var package = require('./package.json');
    var docs = '';
    docs += 'The available commands for launder are as follows: \n\n';
    for (var i in this.commands) {
        docs += 'launder ' + this.commands[i] + '\n';
    }

    docs += '\nFor more info see ' + package.homepage + '\n';
    console.log(docs);
}

Laundry.prototype.create = function(job) {
    console.log('create ' + job);
}

Laundry.prototype.edit = function(job) {

}

Laundry.prototype.run = function(job) {

}

Laundry.prototype.delete = function(job) {

}

Laundry.prototype.list = function(job) {

}

Laundry.prototype.tick = function(job) {

}

module.exports = exports = new Laundry();