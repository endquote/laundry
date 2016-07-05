'use strict';

/*
JSON washer
input: TODO
output: Writes an array of Items to disk as JSON files
*/

ns('Washers', global);
Washers.JSON = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'JSON';
    this.className = Helpers.buildClassName(__filename);

    this.output = _.merge({
        description: 'Writes items to disk as JSON files.'
    }, this.output);
};

Washers.JSON.prototype = Object.create(Washer.prototype);
Washers.JSON.className = Helpers.buildClassName(__filename);

Washers.JSON.prototype.doOutput = function(items, callback) {
    if (!items) {
        callback();
    }

    var that = this;
    async.eachSeries(items, function(item, callback) {
        var target = Item.buildPrefix(that.job.name, that.className) + '/' + (item.id || item.date.unix()) + '.json';
        var json = JSONbig.stringify(item, null, 2);
        Storage.writeFile(target, json, function(err, destination) {
            if (destination) {
                that.job.log.debug('Wrote to ' + destination);
            }
            callback(err);
        });
    }, callback);
};

module.exports = Washers.JSON;
