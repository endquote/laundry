class Storage {
  init() {
    return this._initLog()
      .then(() => this._initConfig());
  }
}

module.exports = Storage;
