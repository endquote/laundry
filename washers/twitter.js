'use strict';

var OAuth = require('oauth'); // https://www.npmjs.com/package/oauth

/*
Base class for Twitter washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Twitter = function(config, job) {

    this.consumerKey = null;
    this.consumerSecret = null;
    this.authVerifier = null;
    this.token = null;

    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);

    this._requestOptions = {
        baseUrl: 'https://api.twitter.com/1.1/',
        oauth: {
            consumer_key: this.consumerKey,
            consumer_secret: this.consumerSecret,
            token: this.token ? this.token.accessToken : '',
            token_secret: this.token ? this.token.accessTokenSecret : ''
        }
    };

    this.input = _.merge({
        prompts: [{
            name: 'consumerKey',
            message: 'Consumer key',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }
                console.log(wrap(util.format('Go to https://apps.twitter.com/app/new, enter whatever for the name, description and website. Click "Keys and Access Tokens".')));
                return true;
            }
        }, {
            name: 'consumerSecret',
            message: 'Consumer secret',
            when: function(answers) {
                return job && job.input.token ? false : true;
            }
        }, {
            name: 'authVerifier',
            message: 'Auth code',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }

                // Shorten the oauth URL.
                var done = this.async();

                // helpful: http://codetheory.in/how-to-use-twitter-oauth-with-node-oauth-in-your-node-js-express-application/
                job.input._oauth = new OAuth.OAuth(
                    'https://api.twitter.com/oauth/request_token',
                    'https://api.twitter.com/oauth/access_token',
                    answers.consumerKey,
                    answers.consumerSecret,
                    '1.0A',
                    'oob',
                    'HMAC-SHA1'
                );

                job.input._oauth.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results) {
                    answers.oauthToken = oauth_token;
                    answers.oauthTokenSecret = oauth_token_secret;
                    var url = util.format('https://twitter.com/oauth/authenticate?oauth_token=%s', oauth_token);
                    Helpers.shortenUrl(url, function(url) {
                        var prompt = 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s';
                        console.log(util.format(prompt, url));
                        done(null, true);
                    });
                });
            },
            validate: function(value, answers) {
                if (validator.isWhitespace(value)) {
                    return false;
                }

                // Get the auth token.
                var done = this.async();
                job.input._oauth.getOAuthAccessToken(answers.oauthToken, answers.oauthTokenSecret, value, function(err, oauth_access_token, oauth_access_token_secret, results) {
                    if (err) {
                        done(null, false);
                    } else {
                        answers.token = {
                            accessToken: oauth_access_token,
                            accessTokenSecret: oauth_access_token_secret
                        };
                        done(null, true);
                    }
                });
            }
        }]
    }, this.input);
};

Washers.Twitter.prototype = Object.create(Washer.prototype);
Washers.Twitter.className = Helpers.buildClassName(__filename);

module.exports = Washers.Twitter;
