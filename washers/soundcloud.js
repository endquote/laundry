'use strict';

/*
Base class for SoundCloud washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.SoundCloud = function(config, job) {
    this.clientId = null;
    this.clientSecret = null;
    this.token = null;

    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);
    this._callbackUri = 'https://endquote.github.io/laundry/callbacks/soundcloud.html';

    this._requestOptions = {
        baseUrl: 'https://api.soundcloud.com',
        qs: {
            oauth_token: this.token
        }
    };

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

                var url = 'https://soundcloud.com/connect?' + qs.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    redirect_uri: this._callbackUri,
                    response_type: 'code',
                    scope: 'non-expiring'
                });

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
                Helpers.jsonRequest(log, {
                    uri: 'https://api.soundcloud.com/oauth2/token',
                    method: 'POST',
                    qs: {
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        grant_type: 'authorization_code',
                        redirect_uri: this._callbackUri,
                        code: newValue
                    }
                }, function(response) {
                    that.token = response.access_token;
                    callback();
                }, callback);
            }
        }]
    }, this.input);
};

Washers.SoundCloud.prototype = Object.create(Washer.prototype);
Washers.SoundCloud.className = Helpers.buildClassName(__filename);

module.exports = Washers.SoundCloud;
