'use strict';

// Item which describes a Slack message

ns('Items.Slack', global);
Items.Slack.Message = function(config) {
    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Slack.Message.prototype = Object.create(Item.prototype);
Items.Slack.Message.className = Helpers.buildClassName(__filename);

Items.Slack.Message.downloadLogic = function(prefix, obj, washer, cache) {
    return {};
};

Items.Slack.Message.factory = function(item, downloads) {
    // items are message objects with this bonus info:
    // item.teamInfo, item.channelInfo, item.channelsInfo, item.userInfo

    if (!item.userInfo) {
        item.userInfo = {
            name: 'bot'
        };
    }

    // Format text: https://api.slack.com/docs/formatting
    // To display messages in a web-client, the client should take the following steps:
    // Detect all sequences matching <(.*?)>
    var regex = /<(.*?)>/g;
    var matches;
    var formatted = item.text;
    while (matches = regex.exec(item.text)) { // jshint ignore:line

        // Within those sequences, format content starting with #C as a channel link: https://endquote.slack.com/archives/general
        if (matches[1].indexOf('#C') === 0) {
            var channelId = matches[1].substr(1);
            var channel = item.channelsInfo.filter(function(c) {
                return c.id === channelId;
            })[0];
            formatted = formatted.replace(matches[0], util.format('<a href="https://%s.slack.com/archives/%s">#%s</a>', item.teamInfo.name, channel.name, channel.name));
        }

        // Within those sequences, format content starting with @U as a user link: https://endquote.slack.com/team/josh
        else if (matches[1].indexOf('@U') === 0) {
            var name = matches[1].split('|')[1];
            formatted = formatted.replace(matches[0], util.format('<a href="https://%s.slack.com/team/%s">@%s</a>', item.teamInfo.name, name, name));
        }

        // Within those sequences, format content starting with ! according to the rules for the special command.
        else if (matches[1].indexOf('!') === 0) {
            formatted = formatted.replace(matches[0], '@' + matches[1].substr(1));
        }

        // For remaining sequences, format as a link
        // Once the format has been determined, check for a pipe - if present, use the text following the pipe as the link label
        else {
            var url = matches[1].split('|')[0];
            var label = matches[1].split('|')[1];
            formatted = formatted.replace(matches[0], util.format('<a href="%s">%s</a>', url, label || url));
        }
    }

    return new Items.Slack.Message({
        title: item.userInfo.name + ': ' + Helpers.shortenString(S(formatted).stripTags(), 30),
        description: formatted,
        url: util.format('https://%s.slack.com/archives/%s/p%s', item.teamInfo.name, item.channelInfo.name, item.ts.replace('.', '')),
        date: moment(new Date(1000 * parseInt(item.ts.split('.')[0]))),
        author: item.userInfo.name
    });
};

module.exports = Items.Slack.Message;
