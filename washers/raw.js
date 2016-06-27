'use strict';

/*
Raw washer
input: TODO
output: Writes an array of Items to disk as JSON files
*/

ns('Washers', global);
Washers.Raw = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'Raw';
    this.className = Helpers.buildClassName(__filename);

    this.output = _.merge({
        description: 'Writes items to disk as JSON files.'
    }, this.output);
};

Washers.Raw.prototype = Object.create(Washer.prototype);
Washers.Raw.className = Helpers.buildClassName(__filename);

Washers.Raw.prototype.doOutput = function(items, callback) {
    if (!items) {
        callback();
    }

    var that = this;
    items.forEach(function(item) {
        var target = Item.buildPrefix(that.job.name, that.className) + '/' + item.date.unix() + '.json';
        var json = JSONbig.stringify(item, null, 2);
        Storage.writeFile(target, json, function(err, destination) {
            if (destination) {
                that.job.log.info('Wrote to ' + destination);
            }
        });
    });

    callback();
};

module.exports = Washers.Raw;
