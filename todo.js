/*

kill ig wrapper
kill tumblr wrapper
kill twitter wrapper
kill youtube wrapper
probably kill beforeInput/beforeOutput?

washers/input/google-gmail-search
washers/input/vimeo - their output is weird
washers/input/facebook - get actual content of notifications?

washers/input/pinterest-base
washers/input/pinterest-following

washers/input/instagram -- ig scopes isn't working
washers/input/instagram -- handle: meta of your responses will contain an “error_type=OAuthAccessTokenError”

washers/input/instagram-notifications (no api for this, but could poll likes/comments on recent photos, follows, cache and compare changes)
washers/input/tumblr-notifications
washers/input/twitter-notifications
washers/input/pinterest-notifications
washers/input/vimeo-notifications

washers/input/merge -- collect N rss feeds and merge them into one, removing duplicates (theverge)

better menu for more than a screenful of washers?

global configuration, for things like email errors, log level? "laundry config"
run job after create? don't create if error?
set up email logging for errors?

if a job is running for a long time, don't run it again if its interval comes up (isRunning flag, make sure to unset on error?)
washers/output/rss.grouped - add one post per job run, might need to refactor descriptions
run jobs per the clock? 60 as close to the hour as possible, etc
accept cron schedules, convert other schedules to cron internally
arg to /not/ do inheritance in case you want different tokens?

replace rss.file with a selection of storage modules

storage/file
storage/dropbox
storage/s3

replace ~/.laundry with a storage module

washers/output/pinboard
washers/output/json
washers/output/sqlite
washers/output/email
washers/output/socket.io
washers/output/sms

faster tick? -- look at job files without including everything
nicer callback pages
implement daemon command
when in daemon mode, twitter (others?) should use streaming APIs
magical heroku deployment

washers/readme.md
items/readme.md
storage/readme.md
readme.md

some kind of website?

washers/input/linkedin?

side process -- use feedbin api to do things with starred items
- like starred instagrams
- favorite starred tweets
- like starred fb notifications
- add starred enclosures to podcast


*/