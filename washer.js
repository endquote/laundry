var Backbone = require('Backbone'); // http://backbonejs.org/

var Washer = Backbone.Model.extend({
    defaults: {
        configure: {},
        input: {},
        output: {}
    },

    configure: function() {},
    authorize: function() {},
    input: function() {},
    output: function() {}
});

module.exports = Washer;