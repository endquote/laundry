'use strict';

var mysql = require('mysql'); // https://www.npmjs.com/package/mysql

/*
MySQL washer
input: TODO
output: Writes an array of Items to a MySQL table
*/

ns('Washers', global);
Washers.MySQL = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'MySQL';
    this.className = Helpers.buildClassName(__filename);

    this.output = _.merge({
        description: 'Writes an array of Items to a MySQL table',
        settings: [{
            name: 'hostname',
            prompt: 'What\'s the hostname of the MySQL server?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, 'localhost');
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'port',
            prompt: 'What port is the MySQL server listening on?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, 3306);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(!validator.isInt(newValue));
            }
        }, {
            name: 'username',
            prompt: 'What username should we log in with?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'password',
            prompt: 'What password should we use?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'database',
            prompt: 'What\'s the name of the database to use?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    }, this.output);
};

Washers.MySQL.prototype = Object.create(Washer.prototype);
Washers.MySQL.className = Helpers.buildClassName(__filename);

Washers.MySQL.prototype.doOutput = function(items, callback) {
    var connection = mysql.createConnection({
        host: this.hostname,
        port: this.port,
        user: this.username,
        password: this.password,
        database: this.database,
        //debug: commander.verbose
    });

    async.waterfall([

        function(callback) {
            // Connect to the database
            connection.connect(function(err) {
                callback(err);
            });
        },
        function(callback) {
            // create table
            var query = 'CREATE TABLE IF NOT EXISTS ' + connection.escape(items[0].className);

            var schema = new allItems[items[0].className]();
            console.log(Helpers.typeMap(schema));

            callback();
        },
        function(callback) {
            // insert items
            callback();
        }
    ], function(err) {
        // Disconnect and exit
        connection.destroy();
        callback(err);
    });
};

module.exports = Washers.MySQL;
