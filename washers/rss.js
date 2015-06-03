var Backbone = require('Backbone'); // http://backbonejs.org/
var _ = require('lodash'); // https://lodash.com/docs

var Washer = require('../washer');

RSS = Washer.extend({
    defaults: {
        configure: null,
        input: {
            url: null
        },
        output: {
            file: null
        }
    }
});

_.merge(RSS.prototype.defaults, Washer.prototype.defaults);
module.exports.RSS = RSS;