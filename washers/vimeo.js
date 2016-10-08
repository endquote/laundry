'use strict';

var OAuth = require('oauth'); // https://www.npmjs.com/package/oauth

/*
Base class for Vimeo washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Vimeo = function(config, job) {

    this.consumerKey = null;
    this.consumerSecret = null;
    this.authVerifier = null;
    this.token = null;

    Washer.call(this, config, job);

    this.name = '';
    this.className = Helpers.buildClassName(__filename);
    this._callbackUri = 'https://endquote.github.io/laundry/callbacks/vimeo.html';

    this._requestOptions = {
        baseUrl: 'https://api.vimeo.com/',
        headers: {
            Authorization: util.format('Bearer %s', this.token)
        }
    };

    this.input = _.merge({
        prompts: [{
            name: 'consumerKey',
            message: 'Client Identifier',
            when: function(answers) {
                if (job && job.input.token) {
                    return false;
                }
                console.log(wrap(util.format('Go to https://developer.vimeo.com/apps/new. For the callback URL enter %s. Fill in whatever for the other fields. Click "Register".\nWhat is the "Client Identifier"?', job.input._callbackUri)));
                return true;
            }
        }, {
            name: 'consumerSecret',
            message: 'Client Secrets',
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
                var url = util.format('https://api.vimeo.com/oauth/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s', answers.consumerKey, job.input._callbackUri, 'laundry');
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

                var done = this.async();

                var authHeader = new Buffer(util.format('%s:%s', answers.consumerKey, answers.consumerSecret)).toString('base64');
                request.post('https://api.vimeo.com/oauth/access_token', {
                    form: {
                        grant_type: 'authorization_code',
                        code: value,
                        redirect_uri: job.input._callbackUri
                    },
                    headers: {
                        Authorization: util.format('basic %s', authHeader)
                    }
                }, function(err, response, body) {
                    if (err) {
                        done(err, false);
                    } else {
                        body = JSON.parse(body);
                        if (body.error) {
                            done(null, false);
                        } else {
                            answers.token = body.access_token;
                            done(null, true);
                        }
                    }
                });
            }
        }]
    }, this.input);
};

Washers.Vimeo.prototype = Object.create(Washer.prototype);
Washers.Vimeo.className = Helpers.buildClassName(__filename);

module.exports = Washers.Vimeo;
