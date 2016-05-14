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
        prompts: [{
            name: 'clientId',
            message: 'Client ID',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }
                console.log(wrap('Go to https://console.developers.google.com/ and create a new project. Open the API Manager and activate YouTube and Gmail. Under "Credentials", click "Create Credentials", then "OAuth Client ID". Choose "Other" and give it a name. The client ID and secret will appear.'));
                return true;
            }
        }, {
            name: 'clientSecret',
            message: 'Client secret',
            when: function(answers) {
                return job && job.input.token ? false : true;
            }
        }, {
            name: 'authCode',
            message: 'Auth code',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }

                // Shorten the oauth URL.
                var done = this.async();
                var url = 'https://accounts.google.com/o/oauth2/auth?' + qs.stringify({
                    client_id: answers.clientId,
                    response_type: 'code',
                    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/gmail.readonly'
                });

                Helpers.shortenUrl(url, function(url) {
                    console.log(wrap(util.format('Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s', url)));
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
                    null, {
                        url: 'https://accounts.google.com/o/oauth2/token',
                        method: 'POST',
                        form: {
                            code: value,
                            client_id: answers.clientId,
                            client_secret: answers.clientSecret,
                            redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
                            grant_type: 'authorization_code'
                        }
                    },
                    function(response) {
                        answers.token = response;
                        done(null, true);
                    },
                    function(err) {
                        done(null, false);
                    });
            }
        }]
    }, this.input);
};

Washers.Google.prototype = Object.create(Washer.prototype);
Washers.Google.className = Helpers.buildClassName(__filename);

Washers.Google.prototype.refreshAccessToken = function(callback) {
    var that = this;
    Helpers.jsonRequest(
        that.job.log, {
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
            that.job.log.debug('Refreshed access token');
            that.token.access_token = response.access_token;
            that._requestOptions.headers.Authorization = 'Bearer ' + response.access_token;
            callback();
        },
        callback);
};

module.exports = Washers.Google;
