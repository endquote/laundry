'use strict';

var AWS = require('aws-sdk'); // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
var mime = require('mime-types'); // https://www.npmjs.com/package/mime-types

ns('Storage', global);
Storage.S3 = function() {};

Storage.S3._client = null;
Storage.S3._bucket = null;

Storage.S3.init = function() {
    Storage.S3._client = new AWS.S3({
        accessKeyId: commander.s3key,
        secretAccessKey: commander.s3secret
    });
    Storage.S3._bucket = commander.s3bucket;
    return Storage.S3;
};

Storage.S3.readFileString = function(target, callback) {
    Storage.S3._client.getObject({
        Bucket: Storage.S3._bucket,
        ResponseContentEncoding: 'utf8',
        Key: target
    }, function(err, data) {
        callback(null, err ? '' : data.Body.toString());
    });
};

Storage.S3.writeFile = function(target, contents, callback) {
    target = target.replace(/^\//, ''); // remove leading slash for S3
    var resultUrl = util.format('https://%s.s3.amazonaws.com/%s', Storage.S3._bucket, target);
    Storage.S3._client.upload({
        Bucket: commander.s3bucket,
        Key: target,
        Body: contents,
        ContentType: mime.lookup(target.split('.').pop())
    }, function(err) {
        callback(err, err || resultUrl);
    });
};

module.exports = Storage.S3.init();
