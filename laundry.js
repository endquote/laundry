/**
 * The main Laundry class handles running of jobs.
 * @class Laundry
 */
class Laundry {
  /**
   * Creates an instance of Laundry.
   * @param {object} param
   * @param {string} param.baseUrl - The name of the command to run.
   * @param {number} param.mediaAge - The name of the command to run.
   * @param {string} param.proxy - The name of the command to run.
   */
  constructor({
    baseUrl = null,
    mediaAge = 30,
    proxy = null,
  } = {}) {
    this._baseUrl = baseUrl || null;
    this._mediaAge = mediaAge || 30;
    this._proxy = proxy || null;
    this._storage = null;
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
  }

  createJob() {
    this._ensureStorage();
  }

  editJob() {
    this._ensureStorage();
  }

  runJob() {
    this._ensureStorage();
  }

  destroyJob() {
    this._ensureStorage();
  }

  getJobs() {
    this._ensureStorage();
  }

  tick() {
    this._ensureStorage();
  }
}

module.exports = Laundry;
