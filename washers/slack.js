'use strict';

/*
Base class for Slack washers containing common methods.
input: none
output: none
*/

ns('Washers', global);
Washers.Slack = function(config, job) {
    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);

    this._callbackUri = 'http://tinyurl.com/laundry-slack';

    this._requestOptions = {
        baseUrl: 'https://slack.com/api/',
        qs: {
            token: this.token
        }
    };

    var authSettings = [{
        name: 'clientId',
        prompt: util.format('Go to https://api.slack.com/applications/new. For the Redirect URI, enter %s. Fill in whatever for the other fields. Click "Create Application". The client ID and secret will appear.\nWhat is the client ID?', this._callbackUri),
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

            var url = util.format('https://slack.com/oauth/authorize?client_id=%s&redirect_uri=%s&scope=channels:history%20channels:read%20chat:write:bot%20team:read%20users:read%20identify', this.clientId, this._callbackUri);
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
    }];

    this.input = _.merge({
        settings: authSettings
    }, this.input);

    this.output = _.merge({
        settings: authSettings
    }, this.output);
};

Washers.Slack.prototype = Object.create(Washer.prototype);
Washers.Slack.className = Helpers.buildClassName(__filename);

Washers.Slack.prototype.refreshToken = function(code, callback) {
    var that = this;
    Helpers.jsonRequest(
        extend({
            url: 'https://slack.com/api/oauth.access',
            method: 'POST',
            form: {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this._callbackUri,
                code: code ? code : this.authCode
            }
        }),
        function(response) {
            that.token = response.access_token;
            callback();
        },
        callback);
};

module.exports = Washers.Slack;
