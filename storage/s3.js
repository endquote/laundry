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

Storage.S3.configLog = function(job) {
    // https://www.npmjs.com/package/s3-streamlogger
    var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;
    var stream = new S3StreamLogger({
        bucket: commander.s3bucket,
        access_key_id: commander.s3key,
        secret_access_key: commander.s3secret,
        upload_every: 5000,
        name_format: (job ? 'jobs/' + job.name + '/' : '') + 'logs/%Y-%m-%d-%H-%M.log'
    });
    var opts = {
        stream: stream,
        level: global.log.level
    };
    return opts;
};

// Delete old log files. 
Storage.S3.clearLog = function(job, retainRuns, callback) {

    // Subtract one, because a new one will get added after this.
    retainRuns = Math.max(0, retainRuns - 1);

    var prefix = (job ? 'jobs/' + job.name + '/' : '') + 'logs';
    Storage.cacheFiles(job ? job.log : log, prefix, function(err, cache) {
        if (err) {
            callback(err);
            return;
        }

        var expired = cache.sort(function(a, b) {
                if (a.fileName < b.fileName) {
                    return -1;
                }
                if (a.fileName > b.fileName) {
                    return 1;
                }
                return 0;
            })
            .reverse()
            .slice(retainRuns)
            .map(function(file) {
                return {
                    Key: file.fileName
                };
            });

        Storage.S3._client.deleteObjects({
            Bucket: commander.s3bucket,
            Delete: {
                Objects: expired
            }
        }, function(err, data) {
            if (callback) {
                callback(err);
            }
        });
    });
};

// Do any log cleanup that this storage method needs.
Storage.S3.flushLogs = function(callback) {
    var streams = laundryConfig.jobs
        .filter(function(job) {
            return job.log && job.log.stream;
        }).map(function(job) {
            return job.log.stream;
        });
    streams.push(log.stream);

    async.each(streams, function(stream, callback) {
        stream.flushFile(); // flushFile should really take a callback...
        callback();
    }, callback);
};

// Given a URL and a target, copy the URL to the target.
//
// url: the url to download
// taget: the path to download to
// targetDate: a date object to use as the last modified time of the file
// cache: an array of {fileName, modified} objects not to download, since they are there already
// useYTDL: use youtube-download to transform the url to a media url
// download: false to not actually download, only construct the result object (weird, but allows for optional downloads without tons of pain)
// callback: (err, {oldUrl, newUrl, error, ytdl, bytes}) - the ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Storage.S3.downloadUrl = function(log, url, target, targetDate, cache, useYTDL, download, callback) {
    var result = {
        oldUrl: url,
        newUrl: url,
        ytdl: null,
        bytes: 0
    };

    target = target.split('?')[0]; // no query strings

    var resultUrl = util.format('https://%s.s3.amazonaws.com/%s', commander.s3bucket, target);

    if (commander.baseUrl) {
        resultUrl = commander.baseUrl + target;
    }

    // See if the file has previously been uploaded
    if (download && cache && cache.length) {
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

    // No URL requested and the target wasn't cached.
    if (!url) {
        process.nextTick(function() {
            callback(null, result);
        });
        return;
    }

    if (download && useYTDL) {
        // Use the youtube-dl to change the url into a media url
        log.debug('Getting media URL for ' + url);
        ytdl.getInfo(url, function(err, info) {
            result.error = err;
            if (!err && info.url) {
                result.newUrl = url = info.url;
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
        if (!download) {
            callback(null, result);
            return;
        }

        var params = {
            Bucket: commander.s3bucket,
            Key: target
        };

        log.debug('Downloading ' + params.Key);
        var protocol = require('url').parse(url).protocol;
        var req = protocol === 'http:' ? http.request : https.request;
        try {
            req(url, function(response) {
                    if (response.statusCode !== 200 && response.statusCode !== 302) {
                        callback(response.error, result);
                        return;
                    }

                    params.Body = response;
                    params.ContentLength = response.headers['content-length'] ? parseInt(response.headers['content-length']) : null;
                    params.ContentType = response.headers['content-type'];

                    // You can't set the last modfied date, but you can add custom metadata which represents it.
                    if (targetDate && targetDate.getTime) {
                        params.Metadata = {
                            'last-modified': targetDate.getTime().toString()
                        };
                    }

                    Storage.S3._client.upload(params)
                        .on('httpUploadProgress', function(progress) {
                            // console.log(progress);
                        })
                        .send(function(err, data) {
                            result.error = err;
                            if (!err) {
                                result.bytes = response.headers['content-length'];
                                result.newUrl = resultUrl;
                            }
                            callback(err, result);
                        });
                })
                .on('error', function(err) {
                    callback(err, result);
                })
                .end();
        } catch (err) {
            callback(err, result);
        }
    }
};

// Given a directory, return all the files.
Storage.S3.cacheFiles = function(log, dir, callback) {
    log.debug('Caching ' + dir);
    var objects = [];
    var lastCount = 0;
    var pageSize = 1000;
    async.doWhilst(
        function(callback) {

            // Get a pile of objects.
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
                    /* // This is just too slow.
                    // Replace the last-modified with the custom one set in downloadUrl.
                    async.eachLimit(data.Contents, 10, function(obj, callback) {
                        Storage.S3._client.headObject({
                            Bucket: commander.s3bucket,
                            Key: obj.Key
                        }, function(err, data) {
                            if (data.Metadata && data.Metadata['last-modified']) {
                                obj.LastModified = new Date(parseInt(data.Metadata['last-modified']));
                            }
                            callback(err);
                        });
                    }, function(err) {

                        // Add this pile to the rest.
                        objects = objects.concat(data.Contents);
                        lastCount = data.Contents.length;
                        callback(err);
                    });
                    */
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
                    modified: obj.LastModified // TODO: Get last-modified that's specified in downloadUrl, hopefully not by calling headObject on every file?
                };
            });
            callback(err, objects);
        }
    );
};

// Delete files with a last-modified before a given date.
Storage.S3.deleteBefore = function(log, cache, date, callback) {
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
