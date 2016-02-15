'use strict';

/*
Base class for Google washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Google = function(config, job) {
    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);

    this._requestOptions = {
        headers: {
            Authorization: 'Bearer ' + (this.token ? this.token.access_token : '')
        }
    };

    this.input = _.merge({
        settings: [{
            name: 'clientId',
            prompt: 'Go to https://console.developers.google.com/ and create a new project. Open the API Manager and activate YouTube and Gmail. Under "Credentials", click "Create Credentials", then "OAuth Client ID". Choose "Other" and give it a name. The client ID and secret will appear.\nWhat is the client ID?',
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
            prompt: 'What is the client secret?',
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
            name: 'authCode',
            prompt: 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s\n\n',
            beforeEntry: function(rl, job, prompt, callback) {
                if (this.token) {
                    callback(false, prompt);
                    return;
                }

                var url = 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify({
                    client_id: this.clientId,
                    response_type: 'code',
                    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/gmail.readonly'
                });

                var that = this;
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
                Helpers.jsonRequest({
                        url: 'https://accounts.google.com/o/oauth2/token',
                        method: 'POST',
                        form: {
                            code: newValue,
                            client_id: that.clientId,
                            client_secret: that.clientSecret,
                            redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
                            grant_type: 'authorization_code'
                        }
                    },
                    function(response) {
                        that.token = response;
                        callback();
                    },
                    callback);
            }
        }]
    }, this.input);
};

Washers.Google.prototype = Object.create(Washer.prototype);
Washers.Google.className = Helpers.buildClassName(__filename);

Washers.Google.prototype.refreshAccessToken = function(callback) {
    var that = this;
    Helpers.jsonRequest({
            url: 'https://accounts.google.com/o/oauth2/token',
            method: 'POST',
            form: {
                refresh_token: this.token.refresh_token,
                client_id: that.clientId,
                client_secret: that.clientSecret,
                grant_type: 'refresh_token'
            }
        },
        function(response) {
            log.debug('Refreshed access token');
            that.token.access_token = response.access_token;
            that._requestOptions.headers.Authorization = 'Bearer ' + response.access_token;
            callback();
        },
        callback);
};

module.exports = Washers.Google;
