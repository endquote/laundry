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
        settings: [{
            name: 'consumerKey',
            prompt: 'Go to https://apps.twitter.com/app/new, enter whatever for the name, description and website. Click "Keys and Access Tokens".\nWhat is the consumer key?',
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
            name: 'consumerSecret',
            prompt: 'What is the consumer secret?\n',
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
            name: 'authVerifier',
            prompt: 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s\n\n',
            beforeEntry: function(rl, job, prompt, callback) {
                if (this.token) {
                    callback(false, prompt);
                    return;
                }

                var that = this;
                // helpful: http://codetheory.in/how-to-use-twitter-oauth-with-node-oauth-in-your-node-js-express-application/
                this._oauth = new OAuth.OAuth(
                    'https://api.twitter.com/oauth/request_token',
                    'https://api.twitter.com/oauth/access_token',
                    this.consumerKey,
                    this.consumerSecret,
                    '1.0A',
                    'oob',
                    'HMAC-SHA1'
                );
                this._oauth.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results) {
                    that.oauthToken = oauth_token;
                    that.oauthTokenSecret = oauth_token_secret;
                    var url = util.format('https://twitter.com/oauth/authenticate?oauth_token=%s', oauth_token);
                    Helpers.shortenUrl(url, function(url) {
                        prompt = util.format(prompt, url);
                        callback(true, prompt);
                    });
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
                this._oauth.getOAuthAccessToken(this.oauthToken, this.oauthTokenSecret, newValue, function(err, oauth_access_token, oauth_access_token_secret, results) {
                    if (err) {
                        callback(true);
                        return;
                    }
                    that.token = {
                        accessToken: oauth_access_token,
                        accessTokenSecret: oauth_access_token_secret
                    };
                    callback(false);
                });
            }
        }]
    }, this.input);
};

Washers.Twitter.prototype = Object.create(Washer.prototype);
Washers.Twitter.className = Helpers.buildClassName(__filename);

module.exports = Washers.Twitter;
