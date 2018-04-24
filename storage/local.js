'use strict';

var ytdl = require('youtube-dl'); // https://github.com/fent/node-youtube-dl
var http = require('follow-redirects').http; // https://www.npmjs.com/package/follow-redirects
var https = require('follow-redirects').https; // https://www.npmjs.com/package/follow-redirects
var walk = require('walk'); // https://github.com/coolaj86/node-walk

ns('Storage', global);
Storage.Local = function() {};

Storage.Local.configLog = function(job) {
    // https://github.com/winstonjs/winston/blob/master/docs/transports.md#file-transport
    var logPath = path.join(commander.local, 'logs');
    if (job) {
        logPath = path.join(commander.local, 'jobs', job.name, 'logs');
    }
    fs.ensureDirSync(logPath);

    var opts = {
        level: global.log.level,
        filename: path.join(logPath, moment().format('YYYY-MM-DD-HH-mm') + '.log'),
        tailable: true
    };

    return opts;
};

// Delete old log files. 
Storage.Local.clearLog = function(job, retainRuns, callback) {
    var logPath = path.join(commander.local, 'logs');
    if (job) {
        logPath = path.join(commander.local, 'jobs', job.name, 'logs');
    }

    if (!fs.existsSync(logPath)) {
        if (callback) {
            callback();
        }
        return;
    }

    var err = null;
    try {
        fs.readdirSync(logPath)
            .sort()
            .reverse()
            .slice(retainRuns)
            .forEach(function(file, index) {
                fs.unlinkSync(path.join(logPath, file));
            });
    } catch (e) {
        err = e;
    }

    if (callback) {
        callback(err);
    }
};

// Do any log cleanup that this storage method needs.
Storage.Local.flushLogs = function(callback) {
    callback();
};

// Given a URL and a target, copy the URL to the target.
//
// log: the logger to write to
// url: the url to download
// target: the path to download to
// targetDate: a date object to use as the last modified time of the file
// cache: an array of {fileName, modified} objects not to download, since they are there already
// useYTDL: use youtube-download to transform the url to a media url
// download: false to not actually download, only construct the result object (weird, but allows for optional downloads without tons of pain)
// callback: (err, {oldUrl, newUrl, error, ytdl, bytes}) - the ytdl info will be passed only if ytdl was used, and if the target wasn't already cached.
Storage.Local.downloadUrl = function(log, url, target, targetDate, cache, useYTDL, download, callback) {
    var result = {
        oldUrl: url,
        newUrl: url,
        ytdl: null,
        bytes: 0
    };

    var resultUrl = commander.baseUrl + target;
    target = target.split('?')[0]; // no query strings
    target = path.join(commander.local, target);

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

        log.debug('Downloading ' + target);
        var protocol = require('url').parse(url).protocol;
        var req = protocol === 'http:' ? http.request : https.request;
        try {
            req(url, function(response) {
                    if (response.statusCode !== 200 && response.statusCode !== 302) {
                        callback(response.error, result);
                        return;
                    }

                    result.newUrl = resultUrl;
                    response.on('end', function() {
                        result.bytes = response.headers['content-length'];
                        if (response.error || !targetDate) {
                            callback(response.error, result);
                            return;
                        }

                        if (typeof targetDate === 'object' && targetDate.getTime) {
                            targetDate = targetDate.getTime() / 1000;
                        }

                        fs.utimes(target, targetDate, targetDate, function() {
                            callback(response.error, result);
                        });
                    });

                    fs.mkdirp(path.parse(target).dir, function(err) {
                        if (err) {
                            callback(err, result);
                            return;
                        }

                        response.pipe(fs.createWriteStream(target));
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

// Given a directory, return all the files and their last-modified times.
Storage.Local.cacheFiles = function(log, dir, callback) {
    var p = path.join(commander.local, dir);
    var files = [];
    var directories = [];
    var walker = walk.walk(p, {
        followLinks: false,
    });
    walker.on('file', function(root, stat, next) {
        files.push({
            fileName: path.join(root, stat.name),
            modified: stat.mtime
        });
        next();
    });
    walker.on('directory', function(root, stat, next) {
        directories.push({
            fileName: path.join(root, stat.name),
            modified: stat.mtime
        });
        next();
    });
    walker.on('end', function() {
        directories.reverse();
        fs.stat(p, function(err, stat) {
            if (stat) {
                directories.push({
                    fileName: p,
                    modified: stat.mtime
                });
            }
            callback(null, files.concat(directories));
        });
    });
};

// Delete files with a last-modified before a given date.
Storage.Local.deleteBefore = function(log, cache, date, callback) {
    if (!cache.length) {
        callback();
        return;
    }
    var dir = path.parse(cache[0].fileName).dir;
    var expired = cache.filter(function(file) {
        return file.modified < date;
    });
    log.debug(util.format('Cleaning %d files from %s', expired.length, dir));
    async.each(expired, function(file, callback) {
        fs.remove(file.fileName, callback);
    }, callback);
};

// Write some data to a file.
Storage.Local.writeFile = function(target, contents, callback) {
    target = path.join(commander.local, target);
    var dir = path.parse(target).dir;
    fs.mkdirp(dir, function(err) {
        if (err) {
            callback(err);
            return;
        }
        fs.writeFile(target, contents, function(err) {
            callback(err, target);
        });
    });
};

// Read a file as a string.
Storage.Local.readFileString = function(target, callback) {
    target = path.join(commander.local, target);
    fs.readFile(target, {
        encoding: 'utf8'
    }, function(err, data) {
        callback(null, err ? '' : data);
    });
};

module.exports = Storage.Local;
