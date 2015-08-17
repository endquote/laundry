'use strict';

var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var http = require('follow-redirects').http; // https://www.npmjs.com/package/follow-redirects
var https = require('follow-redirects').https; // https://www.npmjs.com/package/follow-redirects
var mime = require('mime-types'); // https://www.npmjs.com/package/mime-types
var AWS = require('aws-sdk'); // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html

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

    callback(result);
    return;

    if (!url) {
        callback(null, result);
        return;
    }

    if (laundryConfig.settings.storageMode === 'none') {
        result.newUrl = url;
        callback(null, result);
    } else if (laundryConfig.settings.storageMode === 'local' || laundryConfig.settings.storageMode === 's3') {

        var resultUrl = laundryConfig.settings.baseUrl + target;
        if (laundryConfig.settings.storageMode === 's3') {
            resultUrl = util.format('https://%s.s3.amazonaws.com/%s', commander.s3bucket, target);
        }

        if (laundryConfig.settings.storageMode === 'local') {
            target = path.join(path.parse(commander.config).dir, target);
        }

        // See if the file has previously been uploaded
        if (cache && cache.length) {
            if (cache.indexOf(target) !== -1) {
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

            if (laundryConfig.settings.storageMode === 'local') {
                fs.mkdirp(path.parse(target).dir, function(err) {
                    if (err) {
                        callback(err);
                        return;
                    }

                    response.pipe(fs.createWriteStream(target));
                    callback(err, result);
                });


            } else if (laundryConfig.settings.storageMode === 's3') {
                params.Body = response;
                params.ContentLength = response.headers['content-length'] ? parseInt(response.headers['content-length']) : null;
                params.ContentType = response.headers['content-type'];
                Storage.s3.upload(params)
                    .on('httpUploadProgress', function(progress) {
                        // console.log(progress);
                    }).send(function(err, data) {
                        result.error = err;
                        if (!err) {
                            result.newUrl = resultUrl;
                        }
                        callback(err, result);
                    });
            }
        }).end();
    }
};

// Given a prefix, return all the matching keys.
Storage.cacheObjects = function(prefix, callback) {
    callback(null, []);
    return;
    if (laundryConfig.settings.storageMode === 'none') {
        process.nextTick(function() {
            callback(null);
        });
    } else if (laundryConfig.settings.storageMode === 'local') {
        var p = path.join(path.parse(commander.config).dir, prefix);
        fs.exists(p, function(exists) {
            if (exists) {
                fs.readdir(p, function(err, files) {
                    files = files.map(function(file) {
                        return p + '/' + file;
                    });
                    callback(err, files);
                });
            } else {
                callback(null, []);
            }
        });
    } else if (laundryConfig.settings.storageMode === 's3') {
        log.debug('Caching ' + prefix);
        var objects = [];
        var lastCount = 0;
        var pageSize = 100;
        async.doWhilst(
            function(callback) {
                Storage.s3.listObjects({
                    Bucket: commander.s3bucket,
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
    }
};

// Delete files with a last-modified before a given date.
Storage.deleteBefore = function(prefix, date, callback) {
    callback(null);
    return;
    if (laundryConfig.settings.storageMode === 'none') {
        callback(null);
    } else if (laundryConfig.settings.storageMode === 'local') {

        log.debug('Cleaning ' + prefix);

        var p = path.join(path.parse(commander.config).dir, prefix);
        fs.exists(p, function(exists) {
            if (!exists) {
                callback(null);
                return;
            }
            fs.readdir(p, function(err, files) {
                async.each(files, function(file, callback) {
                    file = p + '/' + file;
                    fs.stat(file, function(err, stat) {
                        if (stat.mtime < date) {
                            fs.unlink(file, callback);
                        } else {
                            callback(err);
                        }
                    });
                }, callback);
            });
        });


    } else if (laundryConfig.settings.storageMode === 's3') {

        log.debug('Cleaning ' + prefix);

        // Get all of the objects with a given prefix.
        var objects = [];
        var lastCount = 0;
        var pageSize = 100;
        async.doWhilst(
            function(callback) {
                Storage.s3.listObjects({
                    Bucket: commander.s3bucket,
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
                Storage.s3.deleteObjects({
                    Bucket: commander.s3bucket,
                    Delete: {
                        Objects: objects
                    }
                }, function(err, data) {
                    callback(err);
                });
            }
        );
    }
};

// Write some data to a file.
Storage.writeFile = function(target, contents, callback) {
    if (commander.local) {
        Storage.Local.writeFile(target, contents, callback);
    } else if (commander.s3key && commander.s3secret && commander.s3bucket) {
        Storage.S3.writeFile(target, contents, callback);
    } else {
        callback();
    }
};

Storage.loadConfig = function(callback) {
    global.laundryConfig = {
        settings: {},
        jobs: []
    };

    function parseConfig(err, contents) {
        if (err) {
            callback(err);
            return;
        }
        try {
            laundryConfig = JSON.parse(contents);
            laundryConfig.jobs.forEach(function(jobConfig) {
                allJobs.push(new Job(jobConfig));
            });
            callback(null, laundryConfig);
        } catch (e) {
            log.warn('Config not found, using default.');
            callback(null, laundryConfig);
        }
    }

    if (commander.local) {
        log.debug('Loading local config');
        Storage.Local.readFileString('config.json', parseConfig);
    } else if (commander.s3key && commander.s3secret && commander.s3bucket) {
        log.debug('Loading S3 config');
        Storage.S3.readFileString('config.json', parseConfig);
    } else {
        callback('Either a local path or S3 credentials must be specified.');
    }
};

Storage.saveConfig = function(callback) {
    laundryConfig.jobs = allJobs;
    var configString = JSON.stringify(laundryConfig, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4);

    if (commander.local) {
        log.debug('Saving local config');
        Storage.Local.writeFile('config.json', configString, callback);
    } else if (commander.s3key && commander.s3secret && commander.s3bucket) {
        log.debug('Saving S3 config');
        Storage.S3.writeFile('config.json', configString, callback);
    } else {
        callback('Nowhere to save config...');
    }
};

module.exports = Storage;
