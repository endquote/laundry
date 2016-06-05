'use strict';

/*
Base class for Instagram washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Instagram = function(config, job) {
    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);
    this._callbackUri = 'https://endquote.github.io/laundry/callbacks/instagram.html';

    this._requestOptions = {
        baseUrl: 'https://api.instagram.com/v1/',
        qs: {
            access_token: this.token
        }
    };

    this.input = _.merge({
        prompts: [{
            name: 'clientId',
            message: 'Client ID',
            default: '2a0cb3ae206a43bb8d5e7308fd7919a2',
            when: function(answers) {
                answers.clientId = '2a0cb3ae206a43bb8d5e7308fd7919a2';
                return false;
                if (job && job.input.token) {
                    return false;
                }
                console.log(wrap(util.format('Go to https://instagram.com/developer/clients/manage/, click "Register a New Client". For the Redirect URI, enter %s. Fill in whatever for the other fields. Click "Register". The client ID and secret will appear.', job.input._callbackUri)));
                return true;
            }
        }, {
            name: 'clientSecret',
            message: 'Client secret',
            default: 'da6a3016880e44ecabcba252165c3d28',
            when: function(answers) {
                answers.clientSecret = 'da6a3016880e44ecabcba252165c3d28';
                return false;
                return job && job.input.token ? false : true;
            }
        }, {
            name: 'authCode',
            message: 'Auth code',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }

                // Shorten the auth URL.
                var done = this.async();
                var scopes = ['basic', 'public_content', 'follower_list', 'relationships'];
                var url = util.format('https://api.instagram.com/oauth/authorize/?scope=%s&client_id=%s&redirect_uri=%s&response_type=code', scopes.join('+'), answers.clientId, job.input._callbackUri);
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
                        url: 'https://api.instagram.com/oauth/access_token',
                        method: 'POST',
                        form: {
                            client_id: answers.clientId,
                            client_secret: answers.clientSecret,
                            grant_type: 'authorization_code',
                            redirect_uri: job.input._callbackUri,
                            code: value
                        }
                    },
                    function(response) {
                        answers.token = response.access_token;
                        done(null, true);
                    },
                    function(err) {
                        done(null, false);
                    });
            }
        }]
    }, this.input);
};

Washers.Instagram.prototype = Object.create(Washer.prototype);
Washers.Instagram.className = Helpers.buildClassName(__filename);

module.exports = Washers.Instagram;
