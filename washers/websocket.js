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
        settings: [{
            name: 'hostname',
            prompt: 'What\'s the hostname of the socket.io server?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, 'localhost');
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'port',
            prompt: 'What port is the socket.io server listening on?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, 80);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(!validator.isInt(newValue));
            }
        }]
    }, this.output);
};

Washers.Websocket.prototype = Object.create(Washer.prototype);
Washers.Websocket.className = Helpers.buildClassName(__filename);

Washers.Websocket.prototype.doOutput = function(items, callback) {
    var server = util.format('http://%s:%d', this.hostname, this.port);
    log.debug('Connecting to ' + server);
    var socket = io(server);
    socket.on('connect', function() {
        log.debug('Connected to ' + server);
        async.eachSeries(
            items,
            function(item, callback) {
                log.debug('Emitting ' + item.url);
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
