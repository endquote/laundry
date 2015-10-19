'use strict';

/*
Slack washer
input: converts the contents of a Slack channel into Items
output: sends Items to a Slack channel
*/

ns('Washers', global);
Washers.Slack.Channel = function(config, job) {
    Washers.Slack.call(this, config, job);

    this.name = 'Slack/Channel';
    this.className = Helpers.buildClassName(__filename);

    this.input = _.merge({
        description: 'Loads items from a Slack channel.',
        settings: [{
            name: 'channel',
            prompt: 'What is the name of the channel to follow?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    }, this.input);

    this.output = _.merge({
        description: 'Sends data to a Slack channel.',
        settings: [{
            name: 'channel',
            prompt: 'What is the name of the channel to send to?',
            afterEntry: function(rl, job, oldValue, newValue, callback) {
                callback(validator.isWhitespace(newValue));
            }
        }]
    }, this.output);
};

Washers.Slack.Channel.prototype = Object.create(Washers.Slack.prototype);
Washers.Slack.Channel.className = Helpers.buildClassName(__filename);

Washers.Slack.Channel.prototype.doInput = function(callback) {
    callback();
};

Washers.Slack.Channel.prototype.doOutput = function(items, callback) {
    callback();
};

module.exports = Washers.Slack.Channel;
