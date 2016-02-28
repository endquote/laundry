# Laundry

A command-line tool written with node.js for "laundering" data by moving it from one API to another in ways that the API authors didn't intend. Laundry can do things like:

* make an RSS feed of all mentions of a hashtag on twitter
* write all of your Instagram likes to a MySQL database
* send anything posted to a Slack channel out over a websocket
* turn your YouTube and Soundcloud subscriptions into podcasts

## Washers

Laundry is made up of _washers_, each with an input or an output, or both. Any input can go to any output. The current washers are:

Input | Output
----- | ------
gMail search | MySQL database
Instagram hashtag | RSS (with enclosures)
Instagram timeline | Slack channel
Instagram likes | Web socket
Instagram user | 
RSS | 
Slack channel | 
Soundcloud artist | 
Soundcloud timeline | 
Tumblr blog | 
Tumblr timeline | 
Twitter hashtag | 
Twitter timeline | 
Twitter list | 
Twitter user | 
YouTube channel |
YouTube subscriptions | 

There are many more ideas for new washers and additions to existing washers, listed among the [issues](https://github.com/endquote/laundry/issues). Development of new washers is a great way to contribute to the project. There is [more documentation](https://github.com/endquote/laundry/blob/master/washers/README.md) on that if you're interested.

## Jobs

The interface to Laundry is via the command-line, with subcommands to create, edit, run, and destroy _jobs_. A job specifies which input and output washers to use, any options required by the washers, and when to run the job. When creating a job, the CLI will ask whatever questions are needed to configure the washers, and the configuration of all jobs is stored in a file.

The commands are shown in `laundry --help`.

```
Commands:

create [job]   configure a new job
edit [job]     edit an existing job
run [job]      run an existing job (or "all" to run all jobs)
destroy [job]  destroy an existing job
list           list configured jobs
tick           run on an interval or cron to trigger scheduled jobs
```

Jobs can run on an interval (every 20 minutes, every hour), at a specific time (every day at noon), after another job completes (if you want to chain them together), or manually.

## Storage

Input washers often can download media files as well as data, and output washers often create files. Those need to go somewhere. Laundry has a modular storage architecture, which allows for two types of storage at the moment: local to the machine it's running on, or on [Amazon S3](https://aws.amazon.com/s3/).

Storage settings are configured via command-line arguments or environment variables, as shown in the `laundry --help`.

```
Options:

-h, --help           output usage information
-V, --version        output the version number
--local [path]       path to use for local file storage, default is LAUNDRY_LOCAL
--s3key [key]        S3 access key ID, default is LAUNDRY_S3_KEY
--s3secret [secret]  S3 access key secret, default is LAUNDRY_S3_SECRET
--s3bucket [bucket]  S3 bucket, default is LAUNDRY_S3_BUCKET
--baseUrl [url]      the base URL that maps to the local folder or S3 bucket, default is LAUNDRY_BASEURL
--mediaAge [days]    the number of days to keep downloaded media around, default is 30
--proxy [proxy]      proxy to use for API requests, use "http://localhost:8888" when debugging with Charles
-v, --verbose        verbose output
```

Logs and configuration data are stored using the same storage method as washers. Development of new storage methods is a great way to contribute to the project. There is [more documentation](https://github.com/endquote/laundry/blob/master/storage/README.md) on that if you're interested.

## Installation

Installation from [npm](https://www.npmjs.com/package/laundry) is easy with `npm install -g laundry`.

You'll want to configure a storage solution as well. If you're using local storage, you'll pass the location of the output folder on the `--local` argument or `LAUNDRY_LOCAL` environment variable. You'll probably want to make that location accessible via a web server, the URL to which is passed on the `--baseUrl` argument or `LAUNDRY_BASEURL` environment variable.

If using S3 storage, it's the same idea, but using `--s3key`, `--s3secret`, and `--s3bucket` arguments.

Most likely, you'll then need laundry to run every so often to trigger jobs. On Mac/Linux, you'll probably want to use a [wrapper script](https://github.com/endquote/laundry/blob/master/samples/setup/mac-linux/laundry-tick.sh) which you [run via cron](https://github.com/endquote/laundry/blob/master/samples/setup/mac-linux/cron-howto.txt). On Windows, something something.

