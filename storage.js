'use strict';

// Misc static storage functions.
function Storage() {}

// Set the storage class to use.
Storage.init = function() {
    Storage.mode = null;
    if (commander.local) {
        Storage.mode = require('./storage/local');
    } else if (commander.s3key) {
        Storage.mode = require('./storage/s3');
    }

    if (!Storage.mode) {
        throw new Error("Couldn't find a storage mode.");
    }

    for (var i in Storage.mode) {
        Storage[i] = Storage.mode[i];
    }

    Storage.initLog();
};

// Load the global config file.
Storage.loadConfig = function(callback) {
    global.laundryConfig = {
        settings: {},
        jobs: []
    };

    Storage.readFileString('config.json', function parseConfig(err, contents) {
        if (err) {
            callback(err);
            return;
        }

        var loaded = false;
        try {
            laundryConfig = JSON.parse(contents);
            var jobs = [];
            laundryConfig.jobs.forEach(function(jobConfig, i) {
                try {
                    jobs.push(new Job(jobConfig));
                } catch (e) {
                    log.error('Job could not be created from config:');
                    log.error(jobConfig);
                    log.error(e);
                }
            });
            laundryConfig.jobs = jobs;
            loaded = true;
        } catch (e) {
            loaded = false;
            log.warn('Config not found, using default.');
        }

        // Set defaults for settings.
        if (!laundryConfig.settings.ytdlupdate) {
            laundryConfig.settings.ytdlupdate = new Date().getTime();
        }

        // Deserialize any settings.
        laundryConfig.settings.ytdlupdate = moment(new Date(laundryConfig.settings.ytdlupdate));

        callback(null, laundryConfig);
    });
};

// Save the global config file.
Storage.saveConfig = function(callback) {
    var c = _.clone(laundryConfig);

    // Serialize any settings.
    c.settings.ytdlupdate = c.settings.ytdlupdate.valueOf();

    var configString = JSON.stringify(c, function(key, value) {
        return value && value.stringify && value.stringify instanceof Function ? value.stringify() : value;
    }, 4);

    Storage.writeFile('config.json', configString, callback);
};

// Create a logger using the current storage mode. If a job is passed, create the category for that job.
Storage.initLog = function(job) {
    var opts;

    if (Storage.mode === Storage.S3) {
        // Using S3, set up S3 logging.
        // https://www.npmjs.com/package/s3-streamlogger
        var S3StreamLogger = require('s3-streamlogger').S3StreamLogger;
        var stream = new S3StreamLogger({
            bucket: commander.s3bucket,
            access_key_id: commander.s3key,
            secret_access_key: commander.s3secret,
            upload_every: 5000,
            name_format: (job ? job.name + '/' : '') + 'logs/%Y-%m-%d-%H-%M.log'
        });
        opts = {
            stream: stream,
            level: global.log.level
        };
        log.s3stream = stream;
    } else if (Storage.mode === Storage.Local) {
        // Using local storage, set up local logging.
        // https://github.com/winstonjs/winston/blob/master/docs/transports.md#file-transport
        var logPath = path.join(commander.local, 'logs');
        if (job) {
            logPath = path.join(commander.local, 'jobs', job.name, 'logs');
        }
        fs.ensureDirSync(logPath);
        opts = {
            level: global.log.level,
            filename: path.join(logPath, moment().format('YYYY-MM-DD-HH-mm') + '.log'),
            maxsize: 100000,
            maxFiles: 10,
            tailable: true
        };
    }

    if (!job) {
        log.add(log.transports.File, opts);
        log.add(log.transports.Console, {
            colorize: true,
            level: global.log.level
        });
    } else {
        var category = 'job-' + job.name;
        log.loggers.add(category, {
            file: opts,
            console: {
                colorize: true,
                level: global.log.level
            }
        });
        job.log = log.loggers.get(category);
    }
};

module.exports = Storage;
