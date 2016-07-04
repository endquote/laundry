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
                name: 'username',
                message: 'What user owns the board?'
            }, {
                name: 'boardName',
                message: 'What is the board\'s name?'
            },
            Washer.downloadMediaOption(this.downloadMedia),
            Washer.quantityOption(this.quantity || 50)
        ]
    });
};

Washers.Pinterest.Board.prototype = Object.create(Washers.Pinterest.prototype);
Washers.Pinterest.Board.className = Helpers.buildClassName(__filename);

Washers.Pinterest.Board.prototype.doInput = function(callback) {
    var posts = [];
    var lastResponse = null;
    var limit = 100;
    var that = this;
    async.doWhilst(function(callback) {

        Helpers.jsonRequest(
            that.job.log,
            extend({
                uri: util.format('/boards/%s/%s/pins/',
                    Washers.Pinterest.encodeName(that.username),
                    Washers.Pinterest.encodeName(that.boardName)),
                qs: {
                    limit: limit,
                    cursor: lastResponse ? lastResponse.page.cursor : '',
                    fields: Washers.Pinterest.pinFields
                }
            }, that._requestOptions),
            function(response) {
                posts = posts.concat(response.data);
                that.job.log.debug(util.format('Got %d/%d posts', posts.length, that.quantity));
                lastResponse = response;
                callback();
            },
            callback);
    }, function() {
        return lastResponse.data.length === limit && posts.length < that.quantity;
    }, function(err) {
        if (err) {
            callback(err);
            return;
        }

        posts = posts.slice(0, that.quantity);

        Item.download(Items.Pinterest.Pin, that, posts, callback);
    });
};

module.exports = Washers.Pinterest.Board;
