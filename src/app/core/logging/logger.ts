type LogMeta = Record<string, unknown>;

function log(level: 'error' | 'warn' | 'info', event: string, meta: LogMeta = {}): void {
  const entry = { time: new Date().toISOString(), level, event, ...meta };

  if (level === 'error') {
    console.error(event, entry);
  } else if (level === 'warn') {
    console.warn(event, entry);
  } else {
    console.info(event, entry);
  }
}

export const logger = {
  error: (event: string, meta?: LogMeta) => log('error', event, meta),
  warn: (event: string, meta?: LogMeta) => log('warn', event, meta),
  info: (event: string, meta?: LogMeta) => log('info', event, meta),
};
