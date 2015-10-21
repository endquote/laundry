'use strict';

// Item which describes a Gmail message

ns('Items.Google.Gmail.Message', global);
Items.Google.Gmail.Message = function(config) {
    Item.call(this, config);
    this.className = Helpers.buildClassName(__filename);
};

Items.Google.Gmail.Message.prototype = Object.create(Item.prototype);
Items.Google.Gmail.Message.className = Helpers.buildClassName(__filename);

// An object passed to async.parallel() which handles downloading of files.
// prefix: the directory at which the download will end up, use to construct the target
// obj: the API response representing the post
// washer: the parent washer, in case you need properties from it
// cache: already downloaded files, pass to downloadUrl
// download: pass to downloadUrl
Items.Google.Gmail.Message.downloadLogic = function(prefix, obj, washer, cache) {
    return {};
};

Items.Google.Gmail.Message.factory = function(item, downloads) {
    // Grab date header
    var date = item.payload.headers.filter(function(header) {
        return header.name === 'Date';
    })[0];
    date = moment(new Date(date.value));

    // Grab subject header
    var subject = item.payload.headers.filter(function(header) {
        return header.name === 'Subject';
    })[0];
    subject = subject ? subject.value : '';

    // Get the message body.
    var body = '';
    if (item.payload.body.size) {
        // It's just in the main payload
        body = new Buffer(item.payload.body.data, 'base64').toString('utf8');
    } else {
        var parts = item.payload.parts;
        // Maybe it's buried in a multipart section
        var multipart = parts.filter(function(part) {
            return part.mimeType === 'multipart/alternative';
        })[0];
        parts = multipart ? multipart.parts : parts;

        // Get html and text, prefer html
        var htmlPart = parts.filter(function(part) {
            return part.mimeType === 'text/html';
        })[0];
        var textPart = parts.filter(function(part) {
            return part.mimeType === 'text/plain';
        })[0];
        var part = htmlPart || textPart;
        body = new Buffer(part.body.data, 'base64').toString('utf8');
    }

    // Get the address the message was sent to
    var to = item.payload.headers.filter(function(header) {
        return header.name === 'To';
    })[0];
    to = to.value;
    to = to.match(/\b([A-Za-z0-9%+._-])+[@]+([%+a-z0-9A-Z.-]*)\b/g)[0];

    // Build the web link to the message
    var link = util.format('https://mail.google.com/mail/?authuser=%s#all/%s', to, item.threadId);

    // Figure out who it's from
    var from = item.payload.headers.filter(function(header) {
        return header.name === 'From';
    })[0];
    from = from.value;
    from = from.replace(/<.*>/, '').trim(); // remove email address
    from = from.replace(/^"|"$/gm, ''); // remove quotes at beginning and end

    return new Items.Google.Gmail.Message({
        title: subject,
        description: body,
        link: link,
        date: date,
        author: from
    });
};

module.exports = Items.Google.Gmail.Message;
