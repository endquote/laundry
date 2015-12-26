'use strict';

/*
Base class for Medium washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Medium = function(config, job) {
    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);
    this._callbackUri = 'http://laundry.endquote.com/callbacks/medium.html';

    this._requestOptions = {
        baseUrl: 'https://api.medium.com/v1',
        headers: {
            Authorization: 'Bearer ' + (this.token ? this.token.access_token : '')
        }
    };

    this.input = _.merge({
        settings: [{
            name: 'clientId',
            prompt: 'Go to https://medium.com/me/applications. Click "New Application" and enter a name. For the callback URL enter %s.\nWhat is the client ID?',
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

                var url = 'https://medium.com/m/oauth/authorize?' + qs.stringify({
                    client_id: this.clientId,
                    scope: 'basicProfile,listPublications,publishPost',
                    state: 'laundry',
                    response_type: 'code',
                    redirect_uri: this._callbackUri
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
                        url: 'https://api.medium.com/v1/tokens',
                        method: 'POST',
                        form: {
                            code: newValue,
                            client_id: that.clientId,
                            client_secret: that.clientSecret,
                            redirect_uri: this._callbackUri,
                            grant_type: 'authorization_code'
                        }
                    },
                    function(response) {
                        console.log('success');
                        console.log(response);
                        that.token = response;
                        callback();
                    },
                    callback);
            }
        }]
    }, this.input);
};

Washers.Medium.prototype = Object.create(Washer.prototype);
Washers.Medium.className = Helpers.buildClassName(__filename);

Washers.Medium.prototype.refreshAccessToken = function(callback) {
    var that = this;
    Helpers.jsonRequest({
            url: 'https://api.medium.com/v1/tokens',
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

module.exports = Washers.Medium;
