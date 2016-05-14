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

    this._callbackUri = 'https://endquote.github.io/laundry/callbacks/slack.html';

    this._requestOptions = {
        baseUrl: 'https://slack.com/api/',
        qs: {
            token: this.token
        }
    };

    function authSettings(mode) {
        return [{
            name: 'clientId',
            message: 'Client ID',
            when: function(answers) {
                if (job && job[mode].token) {
                    return false;
                }
                console.log(wrap(util.format('Go to https://api.slack.com/applications/new. For the Redirect URI, enter %s. Fill in whatever for the other fields. Click "Create Application". The client ID and secret will appear.', job[mode]._callbackUri)));
                return true;
            }
        }, {
            name: 'clientSecret',
            message: 'Client secret',
            when: function(answers) {
                return job && job[mode].token ? false : true;
            }
        }, {
            name: 'authCode',
            message: 'Auth code',
            when: function(answers) {
                if (job && job[mode].token) {
                    return false;
                }

                // Shorten the auth URL.
                var done = this.async();
                var prompt = 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s';
                var url = util.format('https://slack.com/oauth/authorize?client_id=%s&redirect_uri=%s&scope=channels:history%20channels:read%20chat:write:bot%20team:read%20users:read%20identify', answers.clientId, job[mode]._callbackUri);
                Helpers.shortenUrl(url, function(url) {
                    prompt = util.format(prompt, url);
                    console.log(prompt);
                    done(null, true);
                });
            },
            validate: function(value, answers) {
                if (validator.isWhitespace(value)) {
                    return false;
                }

                // Get the auth token.
                var done = this.async();
                Helpers.jsonRequest(
                    log,
                    extend({
                        url: 'https://slack.com/api/oauth.access',
                        method: 'POST',
                        form: {
                            client_id: answers.clientId,
                            client_secret: answers.clientSecret,
                            redirect_uri: job[mode]._callbackUri,
                            code: value
                        }
                    }),
                    function(response) {
                        answers.token = response.access_token;
                        done(null, true);
                    },
                    function(err) {
                        done(null, false);
                    });
            }
        }];
    }

    this.input = _.merge({
        prompts: authSettings('input')
    }, this.input);

    this.output = _.merge({
        prompts: authSettings('output')
    }, this.output);
};

Washers.Slack.prototype = Object.create(Washer.prototype);
Washers.Slack.className = Helpers.buildClassName(__filename);

Washers.Slack.prototype.refreshToken = function(code, callback) {
    var that = this;
    Helpers.jsonRequest(
        log,
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
