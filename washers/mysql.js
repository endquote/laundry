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
                callback(true, prompt, this.hostname || 'localhost');
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'port',
            prompt: 'What port is the MySQL server listening on?',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(true, prompt, this.port || 3306);
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

    // The schema is a mapping of object properties to JavaScript types.
    var schema = new allItems[items[0].className]();
    var primaryKey = schema._primaryKey;
    schema = Helpers.typeMap(schema);

    var table = mysql.escapeId(this._job.name);

    // A mapping of JavaScript types to MySQL types.
    var typeMap = {
        string: 'MEDIUMTEXT',
        date: 'DATETIME',
        array: 'MEDIUMTEXT', // Someday JSON? http://dev.mysql.com/doc/refman/5.7/en/json.html
        object: 'MEDIUMTEXT', // Someday JSON? http://dev.mysql.com/doc/refman/5.7/en/json.html
        number: 'NUMERIC',
        boolean: 'BOOL'
    };

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
            // Connect to the database.
            connection.connect(function(err) {
                callback(err);
            });
        },

        function(callback) {
            // Create the table.
            var query = 'CREATE TABLE IF NOT EXISTS ' + table + ' (\n';
            Object.keys(schema).forEach(function(column, i) {
                if (i > 0) {
                    query += ',\n';
                }
                query += mysql.escapeId(column);
                query += ' ' + typeMap[schema[column]];
            });

            // Define the primary key to prevent duplicates.
            if (primaryKey) {
                if (schema[primaryKey] !== 'number' && schema[primaryKey] !== 'date') {
                    query += ', PRIMARY KEY (' + mysql.escapeId(primaryKey) + ' (100))';
                } else {
                    query += ', PRIMARY KEY (' + mysql.escapeId(primaryKey) + ')';
                }
            }

            query += ')';

            log.debug(query);
            connection.query(query, function(err, results) {
                callback(err);
            });
        },

        function(callback) {
            // Insert items.
            async.eachSeries(items, function(item, callback) {
                var query = 'INSERT INTO ' + table + '(' + Object.keys(schema).join(', ') + ') VALUES (';
                query += Object.keys(schema).map(function(key) {
                    var val = item[key];
                    if (schema[key] === 'date') {
                        val = item[key].format();
                    } else if (schema[key] === 'array' || schema[key] === 'object') {
                        val = JSON.stringify(item[key]);
                    }
                    return connection.escape(val);
                }).join(', ');
                query += ')';
                log.debug(query);

                // Handle errors, if it's a duplicate that's fine, continue on.
                connection.query(query, function(err, result) {
                    if (err && err.code === 'ER_DUP_ENTRY') {
                        err = null;
                    }
                    callback(err);
                });
            }, callback);
        }
    ], function(err) {
        // Disconnect and exit.
        connection.destroy();
        callback(err);
    });
};

module.exports = Washers.MySQL;
