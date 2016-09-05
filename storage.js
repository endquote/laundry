class Storage {
  init() {
    return this.configLog()
      .then(() => this.loadConfig());
  }

  configLog(job, options) {
    if (!job) {
      log.add(log.transports.File, options);
      log.add(log.transports.Console, {
        colorize: true,
        level: global.log.level,
      });
      log.stream = options.stream;
      return log;
    }

    const category = `job-${job.name}`;
    log.loggers.add(category, {
      file: options,
      console: {
        colorize: true,
        level: global.log.level,
      },
    });
    const jobLog = log.loggers.get(category);
    jobLog.stream = options.stream;
    return jobLog;
  }

  loadConfig() {
    const defaultConfig = {
      settings: {},
      jobs: [],
    };

    return this.readFileString('cofig.json')
      .then(data => {
        const config = data ? JSON.parse(data) : defaultConfig;
        return config;
      });
  }
}

module.exports = Storage;
