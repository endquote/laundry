'use strict';

var ig = require('instagram-node').instagram(); // https://github.com/totemstech/instagram-node

/*
Base class for Instagram washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Instagram = function(config) {
    Washer.call(this, config);

    this.name = '';
    this.className = Helpers.classNameFromFile(__filename);
    this._callbackUri = 'http://laundry.endquote.com/callbacks/instagram.html';

    this.input = _.merge({
        settings: [{
            name: 'clientId',
            prompt: util.format('Go to https://instagram.com/developer/clients/manage/, click "Register a New Client". For the Redirect URI, enter %s. Fill in whatever for the other fields. Click "Register". The client ID and secret will appear.\nWhat is the client ID?', this._callbackUri),
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

                var url = util.format('https://api.instagram.com/oauth/authorize/?scope=basic+likes+comments+relationships&client_id=%s&redirect_uri=%s&response_type=code', this.clientId, this._callbackUri);
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

                this.refreshToken(newValue, function(err) {
                    callback(err);
                });
            }
        }]
    }, this.input);
};

Washers.Instagram.prototype = Object.create(Washer.prototype);

Washers.Instagram.prototype.refreshToken = function(code, callback) {
    var that = this;
    Helpers.jsonRequest({
        uri: 'https://api.instagram.com/oauth/access_token',
        method: 'POST',
        form: {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: this._callbackUri,
            code: code ? code : this.authCode
        }
    }, function(response) {
        that.token = response.access_token;
        callback();
    }, callback);
};

module.exports = Washers.Instagram;