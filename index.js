#!/usr/bin/env node

const Command = require('./command');

new Command().execute()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
