'use strict';

/*
Vogue latest fashion shows washer
input: converts the Vogue.com latest fashion show feed to Items
output: none
*/

ns('Washers', global);
Washers.Vogue = function(config, job) {
    Washer.call(this, config, job);

    this.name = 'Vogue';
    this.className = Helpers.buildClassName(__filename);

    this._requestOptions = {
        baseUrl: 'http://www.vogue.com/api/v1'
    };

    this.input = _.merge({
        description: 'Loads the latest fashion shows.',
        prompts: [Washer.downloadMediaOption()]
    }, this.input);
};

Washers.Vogue.prototype = Object.create(Washer.prototype);
Washers.Vogue.className = Helpers.buildClassName(__filename);

// Request the feed, parse it into items, and pass it to the output washer.
Washers.Vogue.prototype.doInput = function(callback) {
    var that = this;

    // Hit the latest shows API to get the show IDs.
    Helpers.jsonRequest(
        that.job.log,
        extend({
            url: '/fashionShow/latestShows?hours=480'
        }, that._requestOptions),
        function(response) {
            var items = response.content;

            // Hit each show's page to get the details.
            async.eachLimit(items, 5, function(item, callback) {
                var url = util.format('http://www.vogue.com/fashion-shows/%s', item.urlFragment);
                that.job.log.debug(url);
                request(url, {
                    proxy: commander.proxy,
                    gzip: true
                }, function(err, response, body) {
                    var re = /<script id="initial-state" type="application\/json">(.*?)<\/script>/gim;
                    var blob = JSON.parse(decodeURIComponent(re.exec(body)[1])).context.dispatcher.stores.FashionShowReviewStore;
                    item.review = blob.reviewCopy;
                    item.slides = blob.slideShows.collection.slides.map(function(slide) {
                        return slide.slidepath;
                    });
                    callback();
                });

            }, function(err) {
                Item.download(Items.Vogue, that, items, callback);
            });
        }
    );
};

module.exports = Washers.Vogue;
