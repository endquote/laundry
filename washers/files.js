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
    var items = [];

    // Do a glob search for the files.
    glob(this.path, {}, function(er, files) {
        async.each(files, function(file, callback) {
            // Get more info about each file.
            fs.stat(file, function(err, stats) {

                // Convert files into Items.
                items.push(new Item({
                    title: path.parse(file).name,
                    caption: file,
                    date: moment(stats.mtime),
                    mediaBytes: stats.size,
                    mediaUrl: commander.baseUrl + file,
                    url: commander.baseUrl + file,
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
