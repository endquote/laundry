const bluebird = require('bluebird');
const fs = bluebird.promisifyAll(require('fs-extra'));
const path = require('path');
const moment = require('moment');

const Storage = require('../storage');

class Local extends Storage {
  constructor(localPath) {
    super();
    if (!localPath) {
      throw new Error('localPath not specified');
    }
    this._localPath = localPath;
  }

  configLog(job) {
    let logPath = path.join(this._localPath, 'logs');
    if (job) {
      logPath = path.join(this._localPath, 'jobs', job.name, 'logs');
    }

    const fileDate = moment().format('YYYY-MM-DD-HH-mm');
    const options = {
      filename: path.join(logPath, `${fileDate}.log`),
      level: global.log.level,
      tailable: true,
    };

    return fs.ensureDirAsync(logPath)
      .then(() => super.configLog(job, options));
  }

  readFileString(target) {
    return fs.readFileAsync(path.join(this._localPath, target), {
      encoding: 'utf8',
    }).catch(() => '');
  }
}

module.exports = Local;
