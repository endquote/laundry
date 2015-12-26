'use strict';

/*
Converts posts from the user's Medium timeline into items.
input: none
output: none
*/
ns('Washers.Medium', global);
Washers.Medium.Timeline = function(config, job) {
    Washers.Medium.call(this, config, job);

    this.name = 'Medium/Timeline';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads recent posts from publications (not people) you follow on Medium.'
    });
};

Washers.Medium.Timeline.prototype = Object.create(Washers.Medium.prototype);
Washers.Medium.Timeline.className = Helpers.buildClassName(__filename);

Washers.Medium.Timeline.prototype.doInput = function(callback) {
    var that = this;
    async.waterfall([
        // Update access token
        function(callback) {
            that.refreshAccessToken(callback);
        },

        // Get my user id
        function(callback) {
            Helpers.jsonRequest(
                extend({
                    uri: '/me'
                }, that._requestOptions),
                function(response) {
                    callback(null, response.data.id);
                }, callback);
        },

        // Get the people I'm following.
        function(userid, callback) {
            Helpers.jsonRequest(
                extend({
                    uri: util.format('/users/%s/publications', userid)
                }, that._requestOptions),
                function(response) {
                    console.log(response.data.length);
                    console.log(response.data[0]);
                    callback(null, []);
                }, callback);
        }
    ], function(err, result) {
        callback(err, result);
    });
};

module.exports = Washers.Medium.Timeline;
