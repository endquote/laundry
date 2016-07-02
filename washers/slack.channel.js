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
        prompts: [{
                name: 'channel',
                message: 'What is the name of the channel to follow?',
                filter: function(value) {
                    return value.replace('#', '');
                }
            },
            Washer.quantityOption(this.quantity || 100)
        ]
    }, this.input);

    this.output = _.merge({
        description: 'Sends data to a Slack channel.',
        prompts: [{
            name: 'channel',
            message: 'What is the name of the channel to send to?',
            filter: function(value) {
                return value.replace('#', '');
            }
        }]
    }, this.output);
};

Washers.Slack.Channel.prototype = Object.create(Washers.Slack.prototype);
Washers.Slack.Channel.className = Helpers.buildClassName(__filename);

Washers.Slack.Channel.prototype.doInput = function(callback) {
    var that = this;
    var teamInfo = null;
    var channelInfo = null;
    var channelsInfo = null;

    async.waterfall([

        // Get the team name with team.info
        // https://api.slack.com/methods/team.info
        function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: 'team.info'
                }, that._requestOptions),
                function(response) {
                    teamInfo = response.team;
                    callback(null);
                },
                callback);
        },

        // Get channel ID with channels.list
        // https://api.slack.com/methods/channels.list
        function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: 'channels.list'
                }, that._requestOptions),
                function(response) {
                    channelsInfo = response.channels;
                    channelInfo = channelsInfo.filter(function(c) {
                        return c.name.toLowerCase() === that.channel.toLowerCase();
                    })[0];
                    callback(channelInfo ? null : util.format('Channel "%s" not found.', that.channel));
                },
                callback);
        },

        // Get latest posts with channels.history
        // https://api.slack.com/methods/channels.history
        function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: 'channels.history',
                    qs: {
                        channel: channelInfo.id,
                        count: that.quantity // could go up to 1000
                    }
                }, that._requestOptions),
                function(response) {
                    callback(null, response.messages);
                },
                callback);
        },

        // Get the post users with users.info
        // https://api.slack.com/methods/users.info
        function(messages, callback) {
            async.eachSeries(messages, function(message, callback) {

                // Augment the message with higher-level info which is used in the slack.message factory.
                message.teamInfo = teamInfo;
                message.channelInfo = channelInfo;
                message.channelsInfo = channelsInfo;

                if (!message.user) {
                    // bots
                    callback();
                    return;
                }

                // If there was already a message by this user, don't request their info again.
                var sameUser = messages.filter(function(m) {
                    return m.userInfo && m.userInfo.id === message.user;
                })[0];

                if (!sameUser) {
                    Helpers.jsonRequest(
                        that.job.log,
                        extend({
                            url: 'users.info',
                            qs: {
                                user: message.user
                            }
                        }, that._requestOptions),
                        function(response) {
                            message.userInfo = response.user;
                            callback();
                        },
                        callback);
                } else {
                    message.userInfo = sameUser.userInfo;
                    process.nextTick(function() {
                        callback();
                    });
                }
            }, function(err) {
                callback(err, messages);
            });
        }
    ], function(err, messages) {
        if (err) {
            callback(err);
            return;
        }

        Item.download(Items.Slack.Message, that, messages, callback);
    });
};

Washers.Slack.Channel.prototype.doOutput = function(items, callback) {
    var that = this;

    async.waterfall([

        // Get channel ID with channels.list
        // https://api.slack.com/methods/channels.list
        function(callback) {
            Helpers.jsonRequest(
                that.job.log,
                extend({
                    url: 'channels.list'
                }, that._requestOptions),
                function(response) {
                    var channelInfo = response.channels.filter(function(c) {
                        return c.name.toLowerCase() === that.channel.toLowerCase();
                    })[0];
                    callback(channelInfo ? null : util.format('Channel "%s" not found.', that.channel), channelInfo);
                },
                callback);
        },

        // Post items with chat.postMessage
        // https://api.slack.com/methods/chat.postMessage
        function(channelInfo, callback) {

            async.eachSeries(items, function(item, callback) {
                if (item.date.isBefore(that.job.lastRun)) {
                    // This item was already posted.
                    process.nextTick(function() {
                        callback();
                    });
                } else {
                    Helpers.jsonRequest(
                        that.job.log,
                        extend({
                            url: 'chat.postMessage',
                            qs: {
                                channel: channelInfo.id,
                                text: item.url, // S(item.description).stripTags().s,
                                unfurl_links: true,
                                unfurl_media: true,
                                parse: 'full',
                                as_user: false
                            }
                        }, that._requestOptions),
                        function(response) {
                            callback();
                        },
                        callback);
                }
            }, callback);
        }
    ], callback);
};

module.exports = Washers.Slack.Channel;
