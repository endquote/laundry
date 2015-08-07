'use strict';

var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var http = require('follow-redirects').http; // https://www.npmjs.com/package/follow-redirects
var https = require('follow-redirects').https; // https://www.npmjs.com/package/follow-redirects
var mime = require('mime-types'); // https://www.npmjs.com/package/mime-types
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

// Misc static storage functions.
function Storage() {}

// Given a URL and an S3 target, copy the URL to S3.
// Cache is an array of keys to not upload, since they are there already.
// Optionally use youtube-dl to transform the url to a media url.
// The callback is (err, {oldUrl, newUrl, error, ytdl})
// The ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Storage.downloadUrl = function(url, target, cache, useYTDL, callback) {
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
        if (cache.indexOf(target) !== -1) {
            log.debug('Found ' + target);
            result.newUrl = resultUrl;

            // Don't call the callback syncronously, interesting: https://github.com/caolan/async/issues/75
            process.nextTick(function() {
                callback(null, result);
            });
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
                doUpload();
            } else {
                callback(err, result);
            }
        });
    } else {
        doUpload();
    }

    function doUpload() {
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

// Given an array of the current keys and an array of the cached keys, delete
// any keys which are in the cache but not in the current list.
Storage.deleteExpired = function(keys, cache, callback) {
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

// Given a prefix, return all the matching keys.
Storage.cacheObjects = function(prefix, callback) {
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

// Delete S3 objects with a last-modified before a given date.
Storage.deleteBefore = function(prefix, date, callback) {
    log.debug('Cleaning ' + prefix);

    // Get all of the objects with a given prefix.
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
            if (err) {
                callback(err);
                return;
            }

            // Get the objects that are older than the requested date and format them as params.
            objects = objects.filter(function(obj) {
                return moment(obj.LastModified).isBefore(date);
            }).map(function(obj) {
                return {
                    Key: obj.Key
                };
            });

            if (!objects.length) {
                callback(err);
                return;
            }

            // Delete the old objects.
            log.debug(util.format('Cleaning %d objects from %s', objects.length, prefix));
            s3.deleteObjects({
                Bucket: process.env.LAUNDRY_S3_BUCKET,
                Delete: {
                    Objects: objects
                }
            }, function(err, data) {
                callback(err);
            });
        }
    );
};

// Write some data to a file.
Storage.writeFile = function(target, contents, callback) {
    target = target.replace(/^\//, ''); // remove leading slash for S3
    var resultUrl = util.format('https://%s.s3.amazonaws.com/%s', process.env.LAUNDRY_S3_BUCKET, target);
    s3.upload({
        Bucket: process.env.LAUNDRY_S3_BUCKET,
        Key: target,
        Body: contents,
        ContentType: mime.lookup(target.split('.').pop())
    }, function(err) {
        callback(err, err || resultUrl);
    });
};

module.exports = Storage;
