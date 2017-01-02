'use strict';

var glob = require('glob'); // https://www.npmjs.com/package/glob

/*
Files washer
input: converts files into Items
*/

ns('Washers', global);
Washers.Files = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'Files';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge({
        description: 'Loads files from disk.',
        prompts: [{
            name: 'path',
            message: 'What files should be searched for? See npmjs.com/package/glob for syntax'
        }]
    }, this.input);
};

Washers.Files.prototype = Object.create(Washer.prototype);
Washers.Files.className = Helpers.buildClassName(__filename);

Washers.Files.prototype.doInput = function(callback) {
    var that = this;
    var items = [];

    // Do a glob search for the files.
    glob(this.path, {
        silent: true,
        strict: false
    }, function(err, files) {
        if (err) {
            callback(err, items);
            return;
        }

        async.each(files, function(file, callback) {
            // Get more info about each file.
            fs.stat(file, function(err, stats) {
                if (err) {
                    that.job.log.error(err);
                    callback();
                    return;
                }

                var url = '';
                if (commander.local) {
                    // Convert to relative path with escaped parts.
                    url = commander.baseUrl + path.relative(commander.local, file)
                        .replace(/\\/g, '/')
                        .split('/')
                        .map(function(p) {
                            return encodeURIComponent(p);
                        })
                        .join('/');
                }

                // Convert files into Items.
                items.push(new Item({
                    title: path.parse(file).name,
                    caption: file,
                    date: moment(stats.mtime),
                    mediaBytes: stats.size,
                    mediaUrl: url,
                    url: url,
                    imageUrl: 'https://endquote.github.io/laundry/icons/apple-touch-icon.png',
                }));
                callback();
            });
        }, function(err) {

            // Return Items.
            callback(err, items);
        });
    });
};

module.exports = Washers.Files;
