'use strict';

var io = require('socket.io-client');

/*
Websocket washer
input: TODO
output: Writes an array of Items to a websocket connection using socket.io
*/

ns('Washers', global);
Washers.Websocket = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'Websocket';
    this.className = Helpers.buildClassName(__filename);

    this.output = _.merge({
        description: 'Writes an array of Items to a websocket connection',
        prompts: [{
            name: 'hostname',
            message: 'What\'s the hostname of the socket.io server?',
            default: 'localhost'
        }, {
            name: 'port',
            message: 'What port is the socket.io server listening on?',
            default: 8080,
            validate: function(value, answers) {
                return value && validator.isInt(value.toString());
            }
        }]
    }, this.output);
};

Washers.Websocket.prototype = Object.create(Washer.prototype);
Washers.Websocket.className = Helpers.buildClassName(__filename);

Washers.Websocket.prototype.doOutput = function(items, callback) {
    var that = this;
    var server = util.format('http://%s:%d', this.hostname, this.port);
    that.job.log.debug('Connecting to ' + server);
    var socket = io(server);
    socket.on('connect', function() {
        that.job.log.debug('Connected to ' + server);
        async.eachSeries(
            items,
            function(item, callback) {
                that.job.log.debug('Emitting ' + item.url);
                socket.emit('item', item, callback);
            },
            function(err) {
                socket.disconnect();
                callback(err);
            });
    });
    socket.on('connect_error', function(err) {
        socket.disconnect();
        callback(err);
    });
};

module.exports = Washers.Websocket;
