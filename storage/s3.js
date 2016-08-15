const Storage = require('../storage');

class S3 extends Storage {
  constructor() {
    super();
    console.log('hi S3');
  }

}

module.exports = S3;
