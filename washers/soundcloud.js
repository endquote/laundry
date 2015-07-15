'use strict';

/*
Base class for SoundCloud washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.SoundCloud = function(config) {

    this.clientId = null;
    this.clientSecret = null;
    this.token = null;
    this._client = require('node-soundcloud');

    Washer.call(this, config);

    this.name = '';
    this.className = Helpers.classNameFromFile(__filename);
    this._callbackUri = 'http://laundry.endquote.com/callbacks/soundcloud.html';

    this.input = _.merge({
        settings: [{
            name: 'clientId',
            prompt: util.format('Go to http://soundcloud.com/you/apps/. For the callback URL enter %s. Fill in whatever for the other fields. Click "Save App".\nWhat is the "Client ID"?\n', this._callbackUri),
            beforeEntry: function(rl, job, prompt, callback) {
                callback(this.token ? false : true, prompt);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'clientSecret',
            prompt: 'What is the "Client Secret"?\n',
            beforeEntry: function(rl, job, prompt, callback) {
                callback(this.token ? false : true, prompt);
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'authVerifier',
            prompt: 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s\n\n',
            beforeEntry: function(rl, job, prompt, callback) {
                if (this.token) {
                    callback(false, prompt);
                    return;
                }

                this._client.init({
                    id: this.clientId,
                    secret: this.clientSecret,
                    uri: this._callbackUri
                });
                var url = this._client.getConnectUrl();
                Helpers.shortenUrl(url, function(url) {
                    prompt = util.format(prompt, url);
                    callback(true, prompt);
                });
            },
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                if (this.token) {
                    callback(false);
                    return;
                }

                if (validator.isWhitespace(newValue)) {
                    callback(true);
                    return;
                }

                var that = this;
                this._client.authorize(newValue, function(err, accessToken) {
                    that.token = accessToken;
                    callback(err);
                });
            }
        }]
    }, this.input);
};

Washers.SoundCloud.prototype = Object.create(Washer.prototype);

Washers.SoundCloud.prototype.beforeInput = function() {
    console.log({
        id: this.clientId,
        secret: this.clientSecret,
        uri: this._callbackUri,
        accessToken: this.token
    });
    this._client.init({
        id: this.clientId,
        secret: this.clientSecret,
        uri: this._callbackUri,
        accessToken: this.token
    });
};

module.exports = Washers.SoundCloud;