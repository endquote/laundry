const Storage = require('../storage');

class Local extends Storage {
  constructor() {
    super();
    console.log('hi local');
  }

}

module.exports = Local;
