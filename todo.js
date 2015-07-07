/*

instagram should inherit like twitter does
include files according to filename length

wahsers/output/rss - better default filename
wahsers/output/rss - better default title

washers/input/bitbucket -- commits from org

washers/input/soundcloud

wahsers/input/snapchat -- no api/npm, https://github.com/mgp25/SC-API/wiki/API-v2-Research

washers/input/google-gmail-search

washers/input/pinterest-base
washers/input/pinterest-following

washers/input/instagram -- ig scopes isn't working
washers/input/instagram -- handle: meta of your responses will contain an “error_type=OAuthAccessTokenError”

washers/input/instagram-notifications (no api for this, but could poll likes/comments on recent photos, follows, cache and compare changes)
washers/input/tumblr-notifications
washers/input/twitter-notifications
washers/input/pinterest-notifications

washers/input/merge -- collect N rss feeds and merge them into one, removing duplicates (theverge)

better menu for more than a screenful of washers?

global configuration, for things like email errors, log level? "laundry config"
run job after create? don't create if error?
set up email logging for errors?

if a job is running for a long time, don't run it again if its interval comes up (isRunning flag, make sure to unset on error?)
washers/output/rss.grouped - add one post per job run, might need to refactor descriptions
run jobs per the clock? 60 as close to the hour as possible, etc

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
magical heroku deployment

washers/readme.md
items/readme.md
storage/readme.md
readme.md

some kind of website?

washers/input/linkedin?

*/

/*

announce: @waxpancake, @pinboard

Fork Feedbin:
Remove duplicates
Header design
Allow scripts for verbs
Subscribe to OPML?

Blog
Kirby, Hexo, Jekyll, Octopress
modernstatic.com

*/