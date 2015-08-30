'use strict';

var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var http = require('follow-redirects').http; // https://www.npmjs.com/package/follow-redirects
var https = require('follow-redirects').https; // https://www.npmjs.com/package/follow-redirects
var AWS = require('aws-sdk'); // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
var mime = require('mime-types'); // https://www.npmjs.com/package/mime-types

ns('Storage', global);
Storage.S3 = function() {};

Storage.S3._client = null;

// Set up the S3 client.
Storage.S3._init = function() {
    Storage.S3._client = new AWS.S3({
        accessKeyId: commander.s3key,
        secretAccessKey: commander.s3secret
    });
    return Storage.S3;
};

// Given a URL and a target, copy the URL to the target.
// Cache is an array of files to not upload, since they are there already.
// Optionally use youtube-dl to transform the url to a media url.
// The callback is (err, {oldUrl, newUrl, error, ytdl})
// The ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Storage.S3.downloadUrl = function(url, target, cache, useYTDL, callback) {
    var result = {
        oldUrl: url,
        newUrl: url,
        ytdl: null
    };

    if (!url) {
        callback(null, result);
        return;
    }

    var resultUrl = util.format('https://%s.s3.amazonaws.com/%s', commander.s3bucket, target);

    if (commander.baseUrl) {
        resultUrl = commander.baseUrl + target;
    }

    // See if the file has previously been uploaded
    if (cache && cache.length) {
        var cached = cache.filter(function(file) {
            return file.fileName === target;
        })[0];
        if (cached) {
            log.debug('Found ' + target);
            result.newUrl = resultUrl;

            // Don't call the callback synchronously, interesting: https://github.com/caolan/async/issues/75
            process.nextTick(function() {
                callback(null, result);
            });
            return;
        }
    }

    if (useYTDL) {
        // Use the youtube-dl to change the url into a media url
        log.debug('Getting media URL for ' + url);
        ytdl.getInfo(url, function(err, info) {
            result.error = err;
            if (!err && info.url) {
                url = result.oldUrl = info.url;
                result.ytdl = info;
                doDownload();
            } else {
                callback(err, result);
            }
        });
    } else {
        doDownload();
    }

    function doDownload() {
        var params = {
            Bucket: commander.s3bucket,
            Key: target
        };

        log.debug('Downloading ' + params.Key);
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
            Storage.S3._client.upload(params)
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

// Given a directory, return all the files.
Storage.S3.cacheFiles = function(dir, callback) {
    log.debug('Caching ' + dir);
    var objects = [];
    var lastCount = 0;
    var pageSize = 100;
    async.doWhilst(
        function(callback) {
            Storage.S3._client.listObjects({
                Bucket: commander.s3bucket,
                Prefix: dir,
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
        },
        function(err) {
            objects = objects.map(function(obj) {
                return {
                    fileName: obj.Key,
                    modified: obj.LastModified
                };
            });
            callback(err, objects);
        }
    );
};

// Delete files with a last-modified before a given date.
Storage.S3.deleteBefore = function(cache, date, callback) {
    if (!cache.length) {
        callback();
        return;
    }
    var expired = cache.filter(function(file) {
        return file.modified < date;
    });
    expired = expired.map(function(file) {
        return {
            Key: file.fileName
        };
    });
    var dir = path.parse(cache[0].fileName).dir;
    log.debug(util.format('Cleaning %d files from %s', expired.length, dir));
    if (!expired.length) {
        callback();
        return;
    }

    Storage.S3._client.deleteObjects({
        Bucket: commander.s3bucket,
        Delete: {
            Objects: expired
        }
    }, function(err, data) {
        callback(err);
    });
};

// Write some data to a file.
Storage.S3.writeFile = function(target, contents, callback) {
    target = target.replace(/^\//, ''); // remove leading slash for S3
    var resultUrl = util.format('https://%s.s3.amazonaws.com/%s', commander.s3bucket, target);
    if (commander.baseUrl) {
        resultUrl = commander.baseUrl + target;
    }

    Storage.S3._client.upload({
        Bucket: commander.s3bucket,
        Key: target,
        Body: contents,
        ContentType: mime.lookup(target.split('.').pop())
    }, function(err) {
        callback(err, err || resultUrl);
    });
};

// Read a file as a string.
Storage.S3.readFileString = function(target, callback) {
    Storage.S3._client.getObject({
        Bucket: commander.s3bucket,
        ResponseContentEncoding: 'utf8',
        Key: target
    }, function(err, data) {
        callback(null, err ? '' : data.Body.toString());
    });
};

module.exports = Storage.S3._init();