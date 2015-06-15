'use strict';

var request = require('request'); // https://www.npmjs.com/package/request
var Autolinker = require('autolinker'); // https://github.com/gregjacobs/Autolinker.js

/*
Base class for Instagram washers containing common methods.
input: none
output: none
*/
ns('Washers', global);
Washers.Instagram = function(config) {
    Washer.call(this, config);

    this.name = '';
    this.classFile = path.basename(__filename);
    this._callbackUri = 'http://laundry.endquote.com/callbacks/instagram.html';

    this.input = _.merge({
        settings: [{
            name: 'clientId',
            prompt: util.format('Go to https://instagram.com/developer/clients/manage/, click "Register a New Client". For the Redirect URI, enter %s. Fill in whatever for the other fields. Click "Register". The client ID and secret will appear.\nWhat is the client ID?', this._callbackUri),
            beforeEntry: function(rl, prompt, callback) {
                callback(this.token ? false : true, prompt);
            },
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(!Washer.validateString(newValue));
            }
        }, {
            name: 'clientSecret',
            prompt: 'What is the client secret?',
            beforeEntry: function(rl, prompt, callback) {
                callback(this.token ? false : true, prompt);
            },
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (oldValue !== newValue) {
                    this.token = null;
                }
                callback(!Washer.validateString(newValue));
            }
        }, {
            name: 'authCode',
            prompt: 'Copy the following URL into your browser, approve access, and paste the code that comes back.\n%s\n\n',
            beforeEntry: function(rl, prompt, callback) {
                if (this.token) {
                    callback(false, prompt);
                    return;
                }

                var url = util.format('https://api.instagram.com/oauth/authorize/?scope=basic+likes+comments+relationships&client_id=%s&redirect_uri=%s&response_type=code', this.clientId, this._callbackUri);
                var that = this;
                require('googleapis').urlshortener('v1').url.insert({
                    resource: {
                        longUrl: url
                    }
                }, function(err, response) {
                    if (!err) {
                        url = response.id;
                    }
                    prompt = util.format(prompt, url);
                    callback(true, prompt);
                });
            },
            afterEntry: function(rl, oldValue, newValue, callback) {
                if (this.token) {
                    callback(false);
                    return;
                }
                if (!Washer.validateString(newValue)) {
                    callback(true);
                    return;
                }

                this.refreshToken(newValue, function(err) {
                    callback(err);
                });
            }
        }]
    }, this.input);
};

Washers.Instagram.prototype = _.create(Washer.prototype);

Washers.Instagram.prototype.refreshToken = function(code, callback) {
    var that = this;
    var form = {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this._callbackUri,
        code: code ? code : this.authCode
    };

    request.post('https://api.instagram.com/oauth/access_token', {
            form: form
        },

        function(err, response, body) {
            if (!err && response.statusCode === 200) {
                try {
                    body = JSON.parse(body);
                    if (!body.access_token) {
                        throw body;
                    }

                    that.token = body.access_token;
                    callback();
                } catch (e) {
                    log.debug(err ? err : body);
                    callback(err ? err : body);
                }
            } else {
                log.debug(err ? err : body);
                callback(err ? err : body);
            }
        });
};

// Convert a media item into a laundry item.
Washers.Instagram.prototype.parseItem = function(media) {
    var item = new Items.Instagram.Media({
        tags: media.tags,
        type: media.type,
        comments: media.comments,
        date: moment.unix(media.created_time),
        url: media.link,
        likes: media.likes,
        image: media.images.standard_resolution.url,
        video: media.videos ? media.videos.standard_resolution.url : null,
        caption: media.caption ? media.caption.text : null,
        author: media.user.username,
        authorpic: media.user.profile_picture,
    });

    item.title = util.format('%s', item.author);
    if (item.caption) {
        item.title += ': ' + item.caption.substr(0, 50);
    }

    if (!item.video) {
        item.description = util.format('<p><a href="%s"><img src="%s" width="640" height="640"/></a></p>', item.url, item.image);
    } else {
        item.description = util.format('<p><video poster="%s" width="640" height="640" controls><source src="%s" type="video/mp4"></video></p>', item.image, item.video);
    }

    if (item.caption) {
        item.description += util.format('<p>%s</p>', Washers.Instagram.linkify(item.caption));
    }

    if (item.likes.data.length) {
        item.description += util.format('<p>%d likes: ', item.likes.count);
        item.likes.data.forEach(function(like, index, list) {
            item.description += util.format('<a href="http://instagram.com/%s">%s</a>', like.username, like.username);
            if (index < list.length - 1) {
                item.description += ', ';
            }
        });
        item.description += '</p>';
    }

    if (item.comments.data.length) {
        item.description += util.format('<p>%d comments:</p>', item.comments.count);
        item.comments.data.forEach(function(comment) {
            item.description += util.format('<p><strong><a href="http://instagram.com/%s">%s</a>:</strong> %s</p>', comment.from.username, comment.from.username, Washers.Instagram.linkify(comment.text));
        });
    }

    return item;
};

Washers.Instagram.linkify = function(str) {
    str = str.replace(/@([\S]+)/g, '<a href="http://instagram.com/$1">@$1</a>');
    str = str.replace(/#([\S]+)/g, '<a href="https://instagram.com/explore/tags/$1/">#$1</a>');
    str = Autolinker.link(str);
    return str;
};

module.exports = Washers.Instagram;