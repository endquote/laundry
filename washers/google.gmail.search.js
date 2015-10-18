'use strict';

var mimelib = require('mimelib');

/*
Gmail Search washer
input: converts mails from a Gmail search into items
output: null
*/
ns('Washers.Google.Gmail', global);
Washers.Google.Gmail.Search = function(config, job) {
    Washers.Google.Gmail.call(this, config, job);

    this.name = 'Gmail/Search';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads mails from a Gmail search query.',
        settings: [{
            name: 'query',
            prompt: 'What is the Gmail search query?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    });
};

Washers.Google.Gmail.Search.prototype = Object.create(Washers.Google.Gmail.prototype);
Washers.Google.Gmail.Search.className = Helpers.buildClassName(__filename);

Washers.Google.Gmail.Search.prototype.doInput = function(callback) {
    var that = this;

    async.waterfall([
        // Update access token
        function(callback) {
            that.refreshAccessToken(callback);
        },

        function(callback) {
            // https://developers.google.com/gmail/api/v1/reference/users/messages/list
            log.debug('Getting messages for query ' + that.query);

            // Request messages matching the query -- seems to return 100 by default, fine for now.
            Helpers.jsonRequest(
                extend({
                    url: '/users/me/messages',
                    qs: {
                        q: that.query
                    }
                }, that._requestOptions),
                function(result) {
                    // Request each actual message.
                    async.eachLimit(result.messages, 10, function(message, callback) {
                        Helpers.jsonRequest(
                            extend({
                                url: '/users/me/messages/' + message.id,
                                qs: {
                                    format: 'full'
                                }
                            }, that._requestOptions),
                            function(result) {

                                // Grab subject header
                                var subject = result.payload.headers.filter(function(header) {
                                    return header.name === 'Subject';
                                })[0];
                                subject = subject ? subject.value : '';

                                var body = '';

                                // For multi-part messages, grab the text and html versions
                                if (result.payload.body.size === 0) {
                                    var parts = result.payload.parts;
                                    var multipart = parts.filter(function(part) {
                                        return part.mimeType === 'multipart/alternative';
                                    })[0];
                                    parts = multipart || parts;


                                    console.log(parts);
                                    var htmlPart = parts.filter(function(part) {
                                        return part.mimeType === 'text/html';
                                    })[0];
                                    var textPart = parts.filter(function(part) {
                                        return part.mimeType === 'text/plain';
                                    })[0];
                                    var part = htmlPart || textPart;

                                    if (part) {
                                        body = mimelib.decodeBase64(part.body.data);
                                        if (!htmlPart) {
                                            console.log('hi');
                                            console.log(body);
                                        }
                                    }
                                }

                                callback();
                            });
                    }, callback);
                },
                callback);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Google.Gmail.Search;
