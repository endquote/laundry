'use strict';

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
    var items = [];

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

                            // Parse out each message.
                            function(result) {

                                // Grab date header
                                var date = result.payload.headers.filter(function(header) {
                                    return header.name === 'Date';
                                })[0];
                                date = moment(new Date(date.value));

                                // Grab subject header
                                var subject = result.payload.headers.filter(function(header) {
                                    return header.name === 'Subject';
                                })[0];
                                subject = subject ? subject.value : '';

                                // Get the message body.
                                var body = '';
                                if (result.payload.body.size) {
                                    // It's just in the main payload
                                    body = new Buffer(result.payload.body.data, 'base64').toString('utf8');
                                } else {
                                    var parts = result.payload.parts;
                                    // Maybe it's buried in a multipart section
                                    var multipart = parts.filter(function(part) {
                                        return part.mimeType === 'multipart/alternative';
                                    })[0];
                                    parts = multipart ? multipart.parts : parts;

                                    // Get html and text, prefer html
                                    var htmlPart = parts.filter(function(part) {
                                        return part.mimeType === 'text/html';
                                    })[0];
                                    var textPart = parts.filter(function(part) {
                                        return part.mimeType === 'text/plain';
                                    })[0];
                                    var part = htmlPart || textPart;
                                    body = new Buffer(part.body.data, 'base64').toString('utf8');
                                }

                                // Get the address the message was sent to
                                var to = result.payload.headers.filter(function(header) {
                                    return header.name === 'To';
                                })[0];
                                to = to.value;
                                to = to.match(/\b([A-Za-z0-9%+._-])+[@]+([%+a-z0-9A-Z.-]*)\b/g)[0];

                                // Build the web link to the message
                                var link = util.format('https://mail.google.com/mail/?authuser=%s#all/%s', to, result.threadId);

                                // Figure out who it's from
                                var from = result.payload.headers.filter(function(header) {
                                    return header.name === 'From';
                                })[0];
                                from = from.value;
                                from = from.replace(/<.*>/, '').trim(); // remove email address
                                from = from.replace(/^"|"$/gm, ''); // remove quotes at beginning and end

                                items.push({
                                    title: subject,
                                    description: body,
                                    link: link,
                                    date: date,
                                    author: from
                                });

                                callback();
                            });
                    }, callback);
                },
                callback);
        }
    ], function(err) {
        if (err) {
            callback(err);
            return;
        }

        Item.download(Items.RSS, that, items, callback);
    });
};

module.exports = Washers.Google.Gmail.Search;
