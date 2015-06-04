var Backbone = require('Backbone'); // http://backbonejs.org/
var _ = require('lodash'); // https://lodash.com/docs

var Washer = require('../washer');

rss = Washer.extend({
    defaults: {
        name: 'rss'
    },

    input: {
        description: 'Loads data from an RSS feed.',
        settings: [{
            name: 'url',
            type: 'url',
            prompt: 'What RSS feed URL do you want to launder?'
        }]
    },

    output: {
        description: 'Writes data to an RSS feed on disk.',
        settings: [{
            name: 'file',
            type: 'file',
            prompt: 'Where do you want to save the output?'
        }]
    },

    doInput: function(callback) {
        callback(null, []);
    },

    doOutput: function(items, callback) {
        callback(null);
    }
});

_.merge(Washer.prototype.defaults, rss.prototype.defaults);
module.exports = rss;