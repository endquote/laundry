'use strict';

/*
Pinterest board washer
input: converts posts from a particular Pinterest board into Items
output: none
*/
ns('Washers.Pinterest', global);
Washers.Pinterest.Board = function(config, job) {
    Washers.Pinterest.call(this, config, job);

    this.name = 'Pinterest/Board';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge(this.input, {
        description: 'Loads posts from a Pinterest board.',
        prompts: [{
                name: 'boardName',
                message: 'Which board do you want to follow?'
            },
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 50)
        ]
    });
};

Washers.Pinterest.Board.prototype = Object.create(Washers.Pinterest.prototype);
Washers.Pinterest.Board.className = Helpers.buildClassName(__filename);

Washers.Pinterest.Board.prototype.doInput = function(callback) {
    callback();
    return;

    var posts = [];
    var lastResponse = null;
    var limit = 20;
    var that = this;
    async.doWhilst(function(callback) {
        // https://www.Pinterest.com/docs/en/api/v2
        Helpers.jsonRequest(
            that.job.log,
            extend({
                uri: '/Board/' + that.BoardHost + '/posts',
                qs: {
                    limit: Math.min(limit, that.quantity - posts.length),
                    offset: posts.length
                }
            }, that._requestOptions),
            function(response) {
                response = response.response;
                posts = posts.concat(response.posts);
                lastResponse = response;
                callback();
            },
            callback);
    }, function() {
        return lastResponse.posts.length === limit && posts.length < that.quantity;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        Item.download(Items.Pinterest.Post, that, posts, callback);
    });
};

module.exports = Washers.Pinterest.Board;
