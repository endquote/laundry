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

    // Including an API key because it looks like they may be hard to get. Please
    // don't cause it to be revoked.
    // https://developers.soundcloud.com/blog/api-sign-up-changes

    this.input = _.merge({
        prompts: [{
            name: 'clientId',
            message: 'Client ID',
            default: 'be9c7a83fe6815b08c68d32a80f75dcf',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }
                console.log(wrap(util.format('Go to http://soundcloud.com/you/apps/. For the callback URL enter %s. Fill in whatever for the other fields. Click "Save App".\nWhat is the "Client ID"?', job.input._callbackUri)));
                return true;
            }
        }, {
            name: 'clientSecret',
            message: 'Client secret',
            default: 'a6cd2c3d058fd887754375c0eedc7c02',
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

                var url = 'https://soundcloud.com/connect?' + qs.stringify({
                    client_id: answers.clientId,
                    client_secret: answers.clientSecret,
                    redirect_uri: job.input._callbackUri,
                    response_type: 'code',
                    scope: 'non-expiring'
                });

                // Shorten the oauth URL.
                var done = this.async();
                var prompt = 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s';
                Helpers.shortenUrl(url, function(url) {
                    console.log(util.format(prompt, url));
                    done(null, true);
                });
            },
            validate: function(value, answers) {
                if (validator.isWhitespace(value)) {
                    return false;
                }

                // Get the auth token.
                var done = this.async();
                Helpers.jsonRequest(null, {
                    uri: 'https://api.soundcloud.com/oauth2/token',
                    method: 'POST',
                    qs: {
                        client_id: answers.clientId,
                        client_secret: answers.clientSecret,
                        grant_type: 'authorization_code',
                        redirect_uri: job.input._callbackUri,
                        code: value
                    }
                }, function(response) {
                    answers.token = response.access_token;
                    done(null, true);
                }, function(err) {
                    done(null, false);
                });
            }
        }]
    }, this.input);
};

Washers.SoundCloud.prototype = Object.create(Washer.prototype);
Washers.SoundCloud.className = Helpers.buildClassName(__filename);

module.exports = Washers.SoundCloud;
