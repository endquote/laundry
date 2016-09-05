/**
 * The main Laundry class handles running of jobs.
 * @class Laundry
 */
class Laundry {
  /**
   * Creates an instance of Laundry.
   * @param {object} param
   * @param {string} param.baseUrl - The base URL of any downloaded files.
   * @param {number} param.mediaAge - How long to keep downloaded media.
   * @param {string} param.proxy - The URL of the proxy server to use.
   * @param {string} param.logLevel - How verbose to make the logs.
   */
  constructor({
    baseUrl = null,
    mediaAge = 30,
    proxy = null,
    logLevel = 'info',
  } = {}) {
    this._baseUrl = baseUrl || null;
    this._mediaAge = mediaAge || 30;
    this._proxy = proxy || null;
    this._storage = null;

    // Configure logging.
    global.log = require('winston');
    log.retainLogs = 30;
    log.level = logLevel;
    log.remove(log.transports.Console);
  }

  /**
   * Configure storage to a local path.
   * @param {string} path - The local path to use.
   */
  setStorageLocal(path) {
    const Local = require('./storage/local');
    this._storage = new Local(path);
  }

  /**
   * Configure storage to use S3.
   * @param {string} key - The S3 access key ID
   * @param {string} secret - The S3 access key secret
   * @param {string} bucket - The S3 bucket
   */
  setStorageS3(key, secret, bucket) {
    const S3 = require('./storage/s3');
    this._storage = new S3(key, secret, bucket);
  }

  _ensureStorage() {
    if (!this._storage) {
      throw new Error('Storage has not been configured, call setStorageLocal or setStorageS3.');
    }
    return this._storage.init();
  }

  createJob() {
    return this._ensureStorage();
  }

  editJob() {
    return this._ensureStorage();
  }

  runJob() {
    return this._ensureStorage();
  }

  destroyJob() {
    return this._ensureStorage();
  }

  getJobs() {
    return this._ensureStorage();
  }

  tick() {
    return this._ensureStorage();
  }
}

module.exports = Laundry;
