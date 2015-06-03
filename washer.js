var Backbone = require('Backbone'); // http://backbonejs.org/

var Washer = Backbone.Model.extend({
    defaults: {
        input: {
            frequency: 60
        }
    },

    configure: function() {},
    authorize: function() {},
    input: function() {},
    output: function() {},
});

module.exports = exports = Washer;