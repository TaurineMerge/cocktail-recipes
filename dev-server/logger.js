const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, event, meta = {}) {
  if (LEVELS[level] < MIN_LEVEL) {
    return;
  }

  const entry = {
    time: new Date().toISOString(),
    level,
    event,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (event, meta) => log('debug', event, meta),
  info: (event, meta) => log('info', event, meta),
  warn: (event, meta) => log('warn', event, meta),
  error: (event, meta) => log('error', event, meta),
};
