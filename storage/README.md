# Storage

Storage objects are static classes with a number of methods for reading and writing to storage mediums. 

* `downloadUrl` - Given a URL and a target path, download the URL. Or not, if it's cached already. Maybe use youtube-dl for extracting media.
* `cacheFiles` - Given a target path, return the filename and last modified date of the files in the directory.
* `deleteBefore` - Given the output of `cacheFiles` and a date, delete any files older than that date.
* `writeFile` - Given a path and some data, write the data to the file at that path.
* `readFileString` - Given a path, return the string contents of the file.
* `configLog` - Return an options object for Winston to set up a log file for a job, or for the global log.
* `clearLog` - Delete old log files for a job, or for the global log.
* `flushLogs` - Flush any outstanding logging streams from all jobs, and the global log.

Unlike [Items](https://github.com/endquote/laundry/blob/master/items/README.md) and [Washers](https://github.com/endquote/laundry/blob/master/washers/README.md), new Storage objects are not automatically included and integrated. New [command-line switches](https://github.com/endquote/laundry/blob/master/index.js#L21) are likely necessary for new storage options, as well as [initialization](https://github.com/endquote/laundry/blob/master/storage.js#L7) and [configuration](https://github.com/endquote/laundry/blob/master/index.js#L149) steps.
