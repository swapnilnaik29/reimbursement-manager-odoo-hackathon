// src/config/logger.js
// Structured console logger with timestamps, levels, and color coding.
// Drop-in replacement for console.log — no extra dependencies required.
'use strict';

const colors = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
};

const LEVELS = {
  DEBUG: { label: 'DEBUG', color: colors.gray,    emoji: '🔍' },
  INFO:  { label: 'INFO ', color: colors.cyan,    emoji: '📋' },
  WARN:  { label: 'WARN ', color: colors.yellow,  emoji: '⚠️ ' },
  ERROR: { label: 'ERROR', color: colors.red,     emoji: '❌' },
  HTTP:  { label: 'HTTP ', color: colors.magenta, emoji: '🌐' },
  DB:    { label: 'DB   ', color: colors.blue,    emoji: '🗄️ ' },
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 23);
}

function formatMeta(meta) {
  if (!meta) return '';
  try {
    return '\n  ' + JSON.stringify(meta, null, 2).split('\n').join('\n  ');
  } catch {
    return ` ${String(meta)}`;
  }
}

function log(level, domain, message, meta) {
  const lvl        = LEVELS[level] || LEVELS.INFO;
  const ts         = `${colors.gray}${timestamp()}${colors.reset}`;
  const badge      = `${lvl.color}${colors.bright}[${lvl.label}]${colors.reset}`;
  const tag        = domain ? `${colors.dim}[${domain}]${colors.reset} ` : '';
  const msg        = `${lvl.color}${message}${colors.reset}`;
  const metaStr    = meta ? `${colors.gray}${formatMeta(meta)}${colors.reset}` : '';

  const line = `${ts} ${lvl.emoji} ${badge} ${tag}${msg}${metaStr}`;

  if (level === 'ERROR') {
    console.error(line);
  } else if (level === 'WARN') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  debug: (domain, message, meta)  => log('DEBUG', domain, message, meta),
  info:  (domain, message, meta)  => log('INFO',  domain, message, meta),
  warn:  (domain, message, meta)  => log('WARN',  domain, message, meta),
  error: (domain, message, meta)  => log('ERROR', domain, message, meta),
  http:  (domain, message, meta)  => log('HTTP',  domain, message, meta),
  db:    (domain, message, meta)  => log('DB',    domain, message, meta),
};

module.exports = logger;
