'use strict';

var touch = require('touch'); // https://github.com/isaacs/node-touch
var chalk = require('chalk'); // https://github.com/sindresorhus/chalk
var mime = require('mime-types'); // https://www.npmjs.com/package/mime-types
var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var http = require('follow-redirects').http; // https://www.npmjs.com/package/follow-redirects
var https = require('follow-redirects').https; // https://www.npmjs.com/package/follow-redirects

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

    Helpers.jsonRequest({
            url: 'https://www.googleapis.com/urlshortener/v1/url',
            method: 'POST',
            contentType: 'application/json',
            body: {
                longUrl: url
            },
            qs: {
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

// Given a file path, try to write to it.
Helpers.validateFile = function(file, callback) {
    file = Helpers.cleanString(file);
    file = path.resolve(file);
    fs.mkdirp(path.dirname(file), function(err) {
        if (err) {
            callback(null);
            return;
        }

        touch(file, {}, function(err) {
            callback(err ? false : true);
        });
    });
};

// Given a file path, try to create a directory.
Helpers.validateDirectory = function(dir, callback) {
    dir = Helpers.cleanString(dir);
    dir = path.resolve(dir);
    fs.mkdirp(dir, function(err) {
        callback(err ? false : true);
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
    file = path.parse(file.toLowerCase());
    var parts = file.dir.split('/');
    parts = parts.slice(parts.indexOf('laundry') + 1);
    parts = parts.concat(file.name.split('.'));
    parts.forEach(function(p, i) {
        parts[i] = p[0].toUpperCase() + p.substr(1);
    });
    return parts.join('.');
};

// Make an HTTP request that expects JSON back, and handle the errors well.
Helpers.jsonRequest = function(options, callback, errorCallback) {
    if (!options) {
        options = {};
    }
    log.debug(JSON.stringify(options));
    options.json = true;
    if (process.argv.indexOf('proxy') !== -1) {
        options.proxy = 'http://localhost:8888';
        options.rejectUnauthorized = false;
    }
    request(options, function(err, response, body) {
        if (!err && (response.statusCode === 200 || response.statusCode === undefined)) {
            callback(body);
        } else {
            errorCallback(err || body);
        }
    });
};

// Given a URL and an S3 target, copy the URL to S3.
// Cache is an array of keys to not upload, since they are there already.
// Optionally use youtube-dl to transform the url to a media url.
// The callback is (err, {oldUrl, newUrl, error, ytdl})
// The ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Helpers.uploadUrl = function(url, target, cache, useYTDL, callback) {
    var result = {
        oldUrl: url,
        newUrl: url,
        error: null,
        ytdl: null
    };

    if (!url) {
        callback(null, result);
        return;
    }

    var resultUrl = util.format('https://%s.s3.amazonaws.com/%s', process.env.LAUNDRY_S3_BUCKET, target);

    // See if the file has previously been uploaded
    if (cache && cache.length) {
        var cached = cache.filter(function(key) {
            return key === target;
        })[0];
        if (cached) {
            log.debug('Found ' + target);
            result.newUrl = resultUrl;
            callback(null, result);
            return;
        }
    }

    var params = {
        Bucket: process.env.LAUNDRY_S3_BUCKET,
        Key: target
    };

    if (useYTDL) {
        // Use the youtube-dl to change the url into a media url
        log.debug('Getting media URL for ' + url);
        ytdl.getInfo(url, function(err, info) {
            result.error = err;
            if (!err && info.url) {
                url = result.oldUrl = info.url;
                result.ytdl = info;
                doUpload(info);
            } else {
                callback(err, result);
            }
        });
    } else {
        doUpload();
    }

    function doUpload(ytdlInfo) {
        // Do the upload
        log.debug('Uploading ' + params.Key);
        var protocol = require('url').parse(url).protocol;
        var req = protocol === 'http' ? http.request : https.request;
        req(url, function(response) {
            if (response.statusCode !== 200 && response.statusCode !== 302) {
                callback(response.error, result);
                return;
            }

            params.Body = response;
            params.ContentLength = response.headers['content-length'] ? parseInt(response.headers['content-length']) : null;
            params.ContentType = response.headers['content-type'];
            s3.upload(params)
                .on('httpUploadProgress', function(progress) {
                    // console.log(progress);
                }).send(function(err, data) {
                    result.error = err;
                    if (!err) {
                        result.newUrl = resultUrl;
                    }
                    callback(err, result);
                });
        }).end();
    }
};

// Given a prefix, return all the matching keys.
Helpers.cacheObjects = function(prefix, callback) {
    log.debug('Caching ' + prefix);
    var objects = [];
    var lastCount = 0;
    var pageSize = 100;
    async.doWhilst(
        function(callback) {
            s3.listObjects({
                Bucket: process.env.LAUNDRY_S3_BUCKET,
                Prefix: prefix,
                MaxKeys: pageSize,
                Marker: objects.length ? objects[objects.length - 1].Key : ''
            }, function(err, data) {
                if (err) {
                    callback(err);
                } else {
                    objects = objects.concat(data.Contents);
                    lastCount = data.Contents.length;
                    callback(err);
                }
            });
        },
        function() {
            return lastCount === pageSize;
        }, function(err) {
            objects = objects.map(function(obj) {
                return obj.Key;
            });
            callback(err, objects);
        }
    );
};

// Given an array of the current keys and an array of the cached keys, delete
// any keys which are in the cache but not in the current list.
Helpers.deleteExpired = function(keys, cache, callback) {
    var objects = cache
        .concat([])
        .filter(function(key) {
            return keys.indexOf(key) === -1;
        })
        .map(function(key) {
            return {
                Key: key
            };
        });

    if (!objects.length) {
        log.debug('No items to clean.');
        callback();
        return;
    }

    // Delete the old objects.
    log.debug(util.format('Cleaning %d objects.', objects.length));
    s3.deleteObjects({
        Bucket: process.env.LAUNDRY_S3_BUCKET,
        Delete: {
            Objects: objects
        }
    }, function(err, data) {
        callback(err);
    });
};

// Test for empty strings.
validator.extend('isWhitespace', function(str) {
    return /^\s*$/.test(str);
});

// Utility methods
_.oldMerge = _.merge;
_.merge = function(object, sources, customizer, thisArg) {
    return _.oldMerge(object, sources, function(a, b) {
        if (_.isArray(a)) {
            return a.concat(b);
        }
    }, thisArg);
};

module.exports = Helpers;
