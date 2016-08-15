/* eslint-disable no-console */

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
      .action(job => this._runCommand('create', job));

    commander.command('edit [job]')
      .description('edit an existing job')
      .action(job => this._runCommand('edit', job));

    commander.command('run [job]')
      .description('run an existing job (or "all" to run all jobs)')
      .action(job => this._runCommand('run', job));

    commander.command('destroy [job]')
      .description('destroy an existing job')
      .action(job => this._runCommand('destroy', job));

    commander.command('list')
      .description('list configured jobs')
      .action(() => this._runCommand('list'));

    commander.command('tick')
      .description('run on an interval or cron to trigger scheduled jobs')
      .action(() => this._runCommand('tick'));

    commander.command('daemon [seconds]')
      .description('run contiuously, calling tick on an interval')
      .action(seconds => this._runCommand('daemon', seconds));
  }

  /**
   * Figure out what to do with the command and the arguments provided and actually run the command.
   * @param {string} name - The name of the command to run.
   * @param {any} args - Any additional arguments for that command.
   */
  _runCommand(name, ...args) {
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
    });

    if (commander.local) {
      this._laundry.setStorageLocal(commander.local);
    } else if (commander.s3key && commander.s3secret && commander.s3bucket) {
      this._laundry.setStorageS3(commander.s3key, commander.s3secret, commander.s3bucket);
    }

    // Actually run the command.
    try {
      switch (name) {
        case 'create':
          this._laundry.createJob();
          break;
        case 'edit':
          this._laundry.editJob();
          break;
        case 'run':
          this._laundry.runJob();
          break;
        case 'destroy':
          this._laundry.destroyJob();
          break;
        case 'list':
          this._laundry.getJobs();
          break;
        case 'tick':
          this._laundry.tick();
          break;
        case 'daemon':
          this._daemonInterval = args.shift() || this._daemonInterval;
          this._laundry.tick(this._daemonTick);
          break;
        default:
          commander.help();
      }
    } catch (e) {
      console.log(e.toString());
    }
  }

  /**
   * Tell commander to run the requested command.
   */
  execute() {
    commander.parse(process.argv);

    // If no command, show help.
    if (commander.args.filter(arg => arg.commands).length === 0) {
      commander.help();
    }
  }

  /**
   * After a tick runs in daemon mode, run it again after a timeout.
   */
  _daemonTick() {
    setTimeout(() => this._laundry.tick(this._daemonTick), this._daemonInterval * 1000);
  }
}

// TODO: Replace with 'export default class { ··· }' in Node 7?
module.exports = Command;
