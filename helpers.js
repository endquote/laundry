'use strict';

var chalk = require('chalk'); // https://github.com/sindresorhus/chalk

// Misc static helper functions.
function Helpers() {}

// Shorten a string to be less than a given length, ending in an ellipsis, trying to break on whole words.
Helpers.shortenString = function(s, len) {
    s = s.trim();

    if (!s) {
        return '';
    }

    if (s.length <= len) {
        return s;
    }

    while (s.length >= len) {
        if (s.indexOf(' ') === -1) {
            s = s.substring(0, len - 1);
            break;
        } else {
            s = s.substring(0, s.lastIndexOf(' '));
        }
    }

    s += '…';
    return s;
};

// Shorten a URL using the Google URL shortner API.
// https://developers.google.com/url-shortener/v1/
Helpers.shortenUrl = function(url, callback) {
    if (!url || !callback) {
        return;
    }

    Helpers.jsonRequest(log, {
            url: 'https://www.googleapis.com/urlshortener/v1/url',
            method: 'POST',
            contentType: 'application/json',
            body: {
                longUrl: url
            },
            qs: {
                // Please don't abuse my precious goo.gl API key
                key: 'AIzaSyA0K_cjd5UE4j04KK8t_En_x_Y-razJIE8',
            },
        },
        function(result) {
            callback(result.id);
        },
        function() {
            callback(url);
        });
};

// Remove chalk stuff from a string.
Helpers.cleanString = function(s) {
    if (!s) {
        s = '';
    }
    return chalk.stripColor(s).trim();
};

Helpers.buildClassName = function(file) {
    file = file.replace(__dirname, '');
    file = path.parse(file.toLowerCase());
    var parts = file.dir.split(/[\/\\]/);
    parts = parts.concat(file.name.split('.'));
    parts = parts.filter(function(p) {
        return p.length > 0;
    });
    parts.forEach(function(p, i) {
        parts[i] = p[0].toUpperCase() + p.substr(1);
    });
    return parts.join('.');
};

// Make an HTTP request that expects JSON back, and handle the errors well.
Helpers.jsonRequest = function(log, options, callback, errorCallback) {
    var validStatusCodes = [200, 201, undefined];
    options = options || {};
    options.gzip = true;

    if (commander.proxy) {
        options.proxy = commander.proxy;
        options.rejectUnauthorized = false;
    }

    if (log) {
        var o = _.clone(options);
        delete(o.jar);
        log.debug(JSON.stringify(o));
    }

    if (!options.json && options.body) {
        options.json = options.body;
        delete options.body;
    }

    request(options, function(err, response, body) {
        if (body) {
            try {
                body = JSONbig.parse(body);
            } catch (e) {}
        }
        if (!err && (body && !body.errors && !body.error) && validStatusCodes.indexOf(response.statusCode) !== -1) {
            callback(body, response);
        } else if (errorCallback) {
            errorCallback(err || body || response.statusCode);
        }
    });
};

// A class which deals with surrogate pairs in Unicode strings, needed if you're parsing strings with emoji and such.
// Used in Items.Twitter.Tweet, probably should be used elsewhere too.
// http://stackoverflow.com/a/6889627/468472
Helpers.wString = function(str) {
    var T = this; //makes 'this' visible in functions
    T.cp = []; //code point array
    T.length = 0; //length attribute
    T.wString = true; // (item.wString) tests for wString object

    var sortSurrogates = function(s) { //returns array of utf-16 code points
        var chrs = [];
        while (s.length) { // loop till we've done the whole string
            if (/[\uD800-\uDFFF]/.test(s.substr(0, 1))) { // test the first character
                // High surrogate found low surrogate follows
                chrs.push(s.substr(0, 2)); // push the two onto array
                s = s.substr(2); // clip the two off the string
            } else { // else BMP code point
                chrs.push(s.substr(0, 1)); // push one onto array
                s = s.substr(1); // clip one from string 
            }
        } // loop
        return chrs;
    };

    T.substr = function(start, len) {
        if (len) {
            return T.cp.slice(start, start + len).join('');
        } else {
            return T.cp.slice(start).join('');
        }
    };

    T.substring = function(start, end) {
        return T.cp.slice(start, end).join('');
    };

    T.replace = function(target, str) {
        if (str.wString) {
            str = str.cp.join('');
        }
        if (target.wString) {
            target = target.cp.join('');
        }
        return T.toString().replace(target, str);
    };

    T.equals = function(s) {
        if (!s.wString) {
            s = sortSurrogates(s);
            T.cp = s;
        } else {
            T.cp = s.cp;
        }
        T.length = T.cp.length;
    };

    T.toString = function() {
        return T.cp.join('');
    };

    T.equals(str);
};

// Given an object, return a map of property values and types.
Helpers.typeMap = function(obj, level, types) {
    if (!types) {
        types = {};
    }

    level = level || '';
    if (level) {
        obj = obj[level];
    }

    for (var name in obj) {
        if (name[0] === '_' || typeof(obj[name]) === 'function' || name === 'className') {
            continue;
        }
        var type = typeof(obj[name]);
        if (moment.isMoment(obj[name])) {
            type = 'date';
        } else if (_.isArray(obj[name])) {
            type = 'array';
        }

        if (type !== 'object') {
            types[level + (level ? '_' : '') + name] = type;
        } else {
            Helpers.typeMap(obj, name, types);
        }
    }

    return types;
};

// Test for empty strings.
validator.extend('isWhitespace', function(str) {
    return /^\s*$/.test(str);
});

// _.merge should concat arrays.
_.oldMerge = _.merge;
_.merge = function(object, sources, customizer, thisArg) {
    return _.oldMerge(object, sources, function(a, b) {
        if (_.isArray(a)) {
            return a.concat(b);
        }
    }, thisArg);
};

// Given a string property path, retrieve the value from an object.
// http://stackoverflow.com/a/16190716/468472
Object.byString = function(obj, path, def) {
    path = path.split('.');
    var len = path.length;
    for (var i = 0; i < len; i++) {
        if (!obj || typeof obj !== 'object') {
            return def;
        }
        obj = obj[path[i]];
    }

    if (obj === undefined) {
        return def;
    }
    return obj;
};

module.exports = Helpers;
