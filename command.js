/* eslint-disable no-console */

const commander = require('commander');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const Laundry = require('./laundry');

/**
 * Encapsulates functionality for running Laundry from the command line.
 * @class Command
 */
class Command {
  constructor() {
    this._daemonInterval = 60;
    this._daemonTimeout = null;
    this._setVersion();
    this._setOptions();
    this._setCommands();
  }

  /**
   * Extract the version number from the project file.
   */
  _setVersion() {
    commander
      .version(JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))).version);
  }

  /**
   * Set up the global arguments.
   */
  _setOptions() {
    commander.option(
      '--local [path]',
      'path to use for local file storage, default is LAUNDRY_LOCAL',
      process.env.LAUNDRY_LOCAL);

    commander.option(
      '--s3key [key]',
      'S3 access key ID, default is LAUNDRY_S3_KEY',
      process.env.LAUNDRY_S3_KEY);

    commander.option(
      '--s3secret [secret]',
      'S3 access key secret, default is LAUNDRY_S3_SECRET',
      process.env.LAUNDRY_S3_SECRET);

    commander.option(
      '--s3bucket [bucket]',
      'S3 bucket, default is LAUNDRY_S3_BUCKET',
      process.env.LAUNDRY_S3_BUCKET);

    commander.option(
      '--baseUrl [url]',
      'the base URL that maps to the local folder or S3 bucket, default is LAUNDRY_BASEURL',
      process.env.LAUNDRY_BASEURL);

    commander.option(
      '--mediaAge [days]',
      'the number of days to keep downloaded media around, default is 30',
      30);

    commander.option(
      '--proxy [proxy]',
      'proxy to use for API requests, use "http://localhost:8888" when debugging with Charles');

    commander.option(
      '-v, --verbose',
      'verbose output');
  }

  /**
   * Set up the subcommands.
   */
  _setCommands() {
    commander.command('create [job]')
      .description('configure a new job')
      .action(job => {
        this._configure();
        this._doCreate(job);
      });

    commander.command('edit [job]')
      .description('edit an existing job')
      .action(job => {
        this._configure();
        this.doEdit(job);
      });

    commander.command('run [job]')
      .description('run an existing job (or "all" to run all jobs)')
      .action(job => {
        this._configure();
        this._doRun(job);
      });

    commander.command('destroy [job]')
      .description('destroy an existing job')
      .action(job => {
        this._configure();
        this._doDestroy(job);
      });

    commander.command('list')
      .description('list configured jobs')
      .action(() => {
        this._configure();
        this._doList();
      });

    commander.command('tick')
      .description('run on an interval or cron to trigger scheduled jobs')
      .action(() => {
        this._configure();
        this._doTick();
      });

    commander.command('daemon [seconds]')
      .description('run contiuously, calling tick on an interval')
      .action(seconds => {
        this._configure();
        this._doDaemon(seconds);
      });
  }

  /**
   * Set up storage and options based on the arguments provided.
   */
  _configure() {
    if (commander.local && (commander.s3key || commander.s3secret || commander.s3bucket)) {
      console.error('Ambiguous: Provide only local or S3 arguments.');
      return;
    }

    if (!commander.local && !(commander.s3key && commander.s3secret && commander.s3bucket)) {
      console.error('A local path or S3 key, secret, and bucket must be provided.');
      return;
    }

    // Configure the Laundry instance.
    this._laundry = new Laundry({
      baseUrl: commander.baseUrl,
      mediaAge: commander.mediaAge,
      proxy: commander.proxy,
      logLevel: commander.verbose ? 'debug' : 'info',
    });

    if (commander.local) {
      this._laundry.setStorageLocal(commander.local);
    } else if (commander.s3key && commander.s3secret && commander.s3bucket) {
      this._laundry.setStorageS3(commander.s3key, commander.s3secret, commander.s3bucket);
    }
  }

  /**
   * Tell commander to run the requested command.
   */
  execute() {
    commander.parse(process.argv);
    if (commander.args.filter(arg => arg.commands).length === 0) {
      commander.help();
    }
  }

  _doCreate(job) {
    throw new Error('not implemented');
  }

  _doEdit(job) {
    throw new Error('not implemented');
  }

  _doRun(job) {
    throw new Error('not implemented');
  }

  _doDestroy(job) {
    throw new Error('not implemented');
  }

  _doTick() {
    throw new Error('not implemented');
  }

  _doDaemon(seconds) {
    this._laundry.tick().then(() => {
      setTimeout(() => this._doDaemon(seconds), seconds * 1000);
    });
  }

  _doList() {
    this._laundry.getJobs().then(() => {
      let out = 'Current jobs: \n';
      if (!this._laundry.config.jobs.length) {
        out = 'There are no jobs configured. Use "laundry create" to make one.';
      }

      this._laundry.config.jobs.forEach(job => {
        if (job) {
          const schedule = job.schedule;
          if (typeof schedule === 'number') {
            out += `${chalk.bold('job.name')} runs every ${job.schedule} minutes.`;
          } else if (!schedule) {
            out += `${chalk.bold('job.name')} runs manually.`;
          } else if (schedule.indexOf(':') !== -1) {
            out += `${chalk.bold('job.name')} runs every day at ${job.schedule}.`;
          } else {
            out += `${chalk.bold('job.name')} runs after another job called ${job.schedule}.`;
          }

          if (job.lastRun && job.lastRun.format) {
            out += ` Last run ${job.lastRun.format('l LTS')}`;
          }

          out += '\n';
        }
      });

      console.log(out);
    });
  }
}

// TODO: Replace with 'export default class { ··· }' in Node 7?
module.exports = Command;
