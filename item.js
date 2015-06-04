var Backbone = require('Backbone'); // http://backbonejs.org/

// Basic class representing an item from anywhere.
var Item = Backbone.Model.extend({

    defaults: {
        title: null,
        description: null,
        url: null,
        date: null,
        author: null,
        tags: null,
        verbs: null
    }

});

module.exports = Item;