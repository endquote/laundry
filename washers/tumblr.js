'use strict';

var OAuth = require('oauth'); // https://www.npmjs.com/package/oauth

/*
Base class for Tumblr washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Tumblr = function(config, job) {

    this.consumerKey = null;
    this.consumerSecret = null;
    this.authVerifier = null;
    this.token = null;

    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);
    this._callbackUri = 'https://endquote.github.io/laundry/callbacks/tumblr.html';

    this._requestOptions = {
        baseUrl: 'http://api.tumblr.com/v2/',
        oauth: {
            consumer_key: this.consumerKey,
            consumer_secret: this.consumerSecret,
            token: this.token ? this.token.accessToken : null,
            token_secret: this.token ? this.token.accessTokenSecret : null
        }
    };

    // Helpful for auth flow: http://t1mg.com/tumblr-api-oauth-in-node/
    this.input = _.merge({
        prompts: [{
            name: 'consumerKey',
            message: 'Consumer key',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }
                console.log(wrap(util.format('Go to https://www.tumblr.com/oauth/register. For the callback URL enter %s. Fill in whatever for the other fields. Click "Register".\nWhat is the "OAuth Consumer Key"?', job.input._callbackUri)));
                return true;
            }
        }, {
            name: 'consumerSecret',
            message: 'Secret key',
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

                var done = this.async();

                job.input._oauth = new OAuth.OAuth(
                    'http://www.tumblr.com/oauth/request_token',
                    'http://www.tumblr.com/oauth/access_token',
                    answers.consumerKey,
                    answers.consumerSecret,
                    '1.0A',
                    null,
                    'HMAC-SHA1'
                );
                job.input._oauth.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results) {
                    answers.oauthToken = oauth_token;
                    answers.oauthTokenSecret = oauth_token_secret;
                    var url = util.format('http://www.tumblr.com/oauth/authorize?oauth_token=%s', oauth_token);
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

                var done = this.async();

                job.input._oauth.getOAuthAccessToken(answers.oauthToken, answers.oauthTokenSecret, value, function(err, oauth_access_token, oauth_access_token_secret, results) {
                    if (err) {
                        done(null, false);
                        return;
                    }
                    answers.token = {
                        accessToken: oauth_access_token,
                        accessTokenSecret: oauth_access_token_secret
                    };
                    done(null, true);
                });
            }
        }]
    }, this.input);
};

Washers.Tumblr.prototype = Object.create(Washer.prototype);
Washers.Tumblr.className = Helpers.buildClassName(__filename);

module.exports = Washers.Tumblr;
