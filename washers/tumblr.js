'use strict';

var OAuth = require('oauth'); // https://www.npmjs.com/package/oauth

/*
Base class for Tumblr washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Tumblr = function(config) {

    this.consumerKey = null;
    this.consumerSecret = null;
    this.authVerifier = null;
    this.token = null;

    Washer.call(this, config);

    this.name = '';
    this.classFile = path.basename(__filename);
    this._callbackUri = 'http://laundry.endquote.com/callbacks/tumblr.html';

    // Helpful for auth flow: http://t1mg.com/tumblr-api-oauth-in-node/
    this.input = _.merge({
        settings: [{
            name: 'consumerKey',
            prompt: util.format('Go to https://www.tumblr.com/oauth/register. For the callback URL enter %s. Fill in whatever for the other fields. Click "Register".\nWhat is the "OAuth Consumer Key"?\n', this._callbackUri),
            beforeEntry: function(rl, prompt, callback) {
                callback(this.accessToken && this.accessTokenSecret ? false : true, prompt);
            },
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'consumerSecret',
            prompt: 'Click "Show secret key". Scary, right? What is the secret key?\n',
            beforeEntry: function(rl, prompt, callback) {
                callback(this.accessToken && this.accessTokenSecret ? false : true, prompt);
            },
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(validator.isWhitespace(newValue));
            }
        }, {
            name: 'authVerifier',
            prompt: 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s\n\n',
            beforeEntry: function(rl, prompt, callback) {
                if (this.accessToken && this.accessTokenSecret) {
                    callback(false, prompt);
                    return;
                }

                var that = this;
                this._oauth = new OAuth.OAuth(
                    'http://www.tumblr.com/oauth/request_token',
                    'http://www.tumblr.com/oauth/access_token',
                    this.consumerKey,
                    this.consumerSecret,
                    '1.0A',
                    null,
                    'HMAC-SHA1'
                );
                this._oauth.getOAuthRequestToken(null, function(err, oauth_token, oauth_token_secret, results) {
                    that.token = {
                        oauthToken: oauth_token,
                        oauthTokenSecret: oauth_token_secret
                    };
                    var url = util.format('http://www.tumblr.com/oauth/authorize?oauth_token=%s', oauth_token);
                    Helpers.shortenUrl(url, function(url) {
                        prompt = util.format(prompt, url);
                        callback(true, prompt);
                    });
                });
            },
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (this.accessToken && this.accessTokenSecret) {
                    callback(false);
                    return;
                }

                if (validator.isWhitespace(newValue)) {
                    callback(true);
                    return;
                }

                var that = this;
                this._oauth.getOAuthAccessToken(this.token.oauthToken, this.token.oauthTokenSecret, newValue, function(err, oauth_access_token, oauth_access_token_secret, results) {
                    if (err) {
                        callback(true);
                        return;
                    }
                    that.token.accessToken = oauth_access_token;
                    that.token.accessTokenSecret = oauth_access_token_secret;
                    callback(false);
                });
            }
        }]
    }, this.input);
};

Washers.Tumblr.prototype = _.create(Washer.prototype);

module.exports = Washers.Tumblr;