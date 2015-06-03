var Backbone = require('Backbone'); // http://backbonejs.org/
var _ = require('lodash'); // https://lodash.com/docs

var Washer = require('../washer');

RSS = Washer.extend({
    defaults: {
        name: 'RSS'
    },

    initialize: function() {},

    description: 'Accepts data from an RSS feed, or outputs data to an RSS feed on disk.',

    configInput: [{
        name: 'url',
        type: 'url',
        prompt: 'What RSS feed URL do you want to launder?'
    }, {
        name: 'number',
        type: 'number',
        prompt: 'How old are you?'
    }],

    configOutput: [{
        name: 'file',
        type: 'file',
        description: 'the file to output RSS to'
    }],

    doAuthorize: null,

    doInput: function() {
        console.log('input');
    },

    doOutput: function() {
        console.log('output');
    }
});

_.merge(Washer.prototype.defaults, RSS.prototype.defaults);
module.exports = RSS;