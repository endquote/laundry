'use strict';

// Example of a socket.io server which can receive items from the websocket washer.

var app = require('http').createServer();
var io = require('socket.io')(app);
var fs = require('fs');

app.listen(8080);

io.on('connection', function(socket) {
    socket.on('item', function(item, callback) {
        console.log(item);
        callback();
    });
});
