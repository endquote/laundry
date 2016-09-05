const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs-extra'));
const path = require('path');

const Storage = require('../storage');

class Local extends Storage {
  constructor(localPath) {
    super();
    if (!localPath) {
      throw new Error('localPath not specified');
    }
    this._localPath = localPath;
  }

  _initLog() {
    const logPath = path.join(this._localPath, 'logs');
    return fs.ensureDirAsync(logPath);
  }

  _initConfig() {
    console.log('config');
    return Promise.resolve();
  }

  readFileString() {

  }
}

module.exports = Local;
