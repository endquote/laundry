/* jslint node: true */
/* jshint strict: true */
'use strict';

var open = require('open'); // https://github.com/jjrdn/node-open
var google = require('googleapis'); // https://github.com/google/google-api-nodejs-client

/*
Base class for Google washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Google = function(config) {
    Washer.call(this, config);

    this.name = '';
    this.classFile = path.basename(__filename);
    this._oauth2Client = null;

    this.input = _.merge({
        settings: [{
            name: 'clientId',
            prompt: 'Go to https://console.developers.google.com/project. Click "Create Project" and enter a name. Under "APIs & auth" click "APIs" and activate YouTube. Under "Credentials", click "Create new Client ID". Choose "Installed Application." The client ID and secret will appear.\nWhat is the client ID?',
            beforeEntry: function(callback) {
                callback(this.token ? false : true);
            },
            afterEntry: function(oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(!Washer.validateString(newValue));
            }
        }, {
            name: 'clientSecret',
            prompt: 'What is the client secret?',
            beforeEntry: function(callback) {
                callback(this.token ? false : true);
            },
            afterEntry: function(oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(!Washer.validateString(newValue));
            }
        }, {
            name: 'authCode',
            prompt: 'Approve access in the browser that just opened.\nWhat is the code that came back?',
            beforeEntry: function(callback) {
                if (this.token) {
                    callback(false);
                    return;
                }

                this._oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
                var url = this._oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/youtube.readonly'
                });
                open(url);
                callback(true);
            },
            afterEntry: function(oldValue, newValue, callback) {
                if (this.token) {
                    callback(false);
                    return;
                }
                if (!Washer.validateString(newValue)) {
                    callback(true);
                    return;
                }
                var that = this;
                this._oauth2Client.getToken(newValue, function(err, token) {
                    if (!err) {
                        that.token = token;
                    }
                    callback(err);
                });
            }
        }]
    }, this.input);
};

Washers.Google.prototype = _.create(Washer.prototype);

Washers.Google.prototype.refreshAccessToken = function(callback) {
    var that = this;
    that._oauth2Client = new google.auth.OAuth2(that.clientId, that.clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
    that._oauth2Client.setCredentials(that.token);
    that._oauth2Client.refreshAccessToken(function(err, token) {
        if (!err) {
            log.debug('Refreshed access token');
            that.token = token;
        }
        callback(err);
    });
};

module.exports = Washers.Google;