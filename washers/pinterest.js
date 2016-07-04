'use strict';

var OAuth = require('oauth'); // https://www.npmjs.com/package/oauth

/*
Base class for Pinterest washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Pinterest = function(config, job) {

    this.consumerKey = null;
    this.consumerSecret = null;
    this.authVerifier = null;
    this.token = null;

    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);
    this._callbackUri = 'https://endquote.github.io/laundry/callbacks/pinterest.html';

    this._requestOptions = {
        baseUrl: 'https://api.pinterest.com/v1/',
        qs: {
            access_token: this.token ? this.token.access_token : ''
        }
    };

    this.input = _.merge(Washers.Pinterest.authPrompts(job, 'input'), this.input);

    this.output = _.merge(Washers.Pinterest.authPrompts(job, 'output'), this.output);
};

Washers.Pinterest.prototype = Object.create(Washer.prototype);
Washers.Pinterest.className = Helpers.buildClassName(__filename);

// Build up the authorization prompts for either mode.
Washers.Pinterest.authPrompts = function(job, mode) {
    return {
        prompts: [{
            name: 'consumerKey',
            message: 'App ID',
            when: function(answers) {
                if (job && job[mode].token) {
                    return false;
                }
                console.log(wrap(util.format('Go to https://developers.pinterest.com/apps/ and create an app. For the callback URL enter %s. Fill in whatever for the other fields.\nWhat is the "App ID"?', job[mode]._callbackUri)));
                return true;
            }
        }, {
            name: 'consumerSecret',
            message: 'App secret',
            when: function(answers) {
                return job && job[mode].token ? false : true;
            }
        }, {
            name: 'authVerifier',
            message: 'Auth code',
            when: function(answers) {
                if (job && job[mode].token) {
                    return false;
                }

                // Get the auth code.
                var done = this.async();
                var url = util.format('https://api.pinterest.com/oauth/?response_type=code&redirect_uri=%s&client_id=%s&scope=read_public,write_public', job[mode]._callbackUri, answers.consumerKey);
                Helpers.shortenUrl(url, function(url) {
                    var prompt = 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s';
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
                Helpers.jsonRequest(
                    null, {
                        url: 'https://api.pinterest.com/v1/oauth/token',
                        method: 'POST',
                        form: {
                            code: value,
                            client_id: answers.consumerKey,
                            client_secret: answers.consumerSecret,
                            redirect_uri: job[mode]._callbackUri,
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
    };
};

// Clean usernames and boardnames for use in API endpoint URLs.
Washers.Pinterest.encodeName = function(boardName) {
    boardName = boardName
        .replace(/[^\sA-zÀ-ÿ0-9]+/g, '') // remove punctuation and emoji
    .replace(/\s+/g, '-'); // replace spaces with a dash
    return encodeURIComponent(boardName);
};

// The fields to return for pins.
Washers.Pinterest.pinFields = 'id,link,url,creator,board,created_at,note,color,counts,media,attribution,image,metadata';

module.exports = Washers.Pinterest;
