#!/usr/bin/env node

// Loading lots of utiltiies into global.
global._ = require('lodash'); // https://lodash.com/docs
global.ns = require('simple-namespace'); // https://www.npmjs.com/package/simple-namespace
global.fs = require('fs-extra'); // https://www.npmjs.com/package/fs.extra
global.path = require('path'); // https://nodejs.org/api/path.html
global.async = require('async'); // https://www.npmjs.com/package/async
global.moment = require('moment'); // http://momentjs.com/docs/
global.util = require('util'); // https://nodejs.org/api/util.html
global.validator = require('validator'); // https://www.npmjs.com/package/validator
global.S = require('string'); // http://stringjs.com
global.qs = require('qs'); // https://www.npmjs.com/package/qs
global.extend = require('deep-extend'); // https://www.npmjs.com/package/deep-extend
global.request = require('request'); // https://github.com/request/request
global.commander = require('commander'); // https://www.npmjs.com/package/commander
global.wrap = require('word-wrap'); // https://www.npmjs.com/package/word-wrap
global.JSONbig = require('json-bigint'); // https://www.npmjs.com/package/json-bigint

class Command {

  get foo() {
    return this._foo;
  }

  set foo(val) {
    this._foo = val;
  }

  constructor() {
    this._foo = false;
  }

  doCommand() {
    console.log(this.foo);
  }
}

new Command().doCommand();
