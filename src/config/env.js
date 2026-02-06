const dotenv = require('dotenv');
dotenv.config();

function getEnv(name, fallback = undefined) {
  const v = process.env[name];
  return (v === undefined || v === '') ? fallback : v;
}

module.exports = {
  PORT: parseInt(getEnv('PORT', '3000'), 10),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  APP_TZ: getEnv('APP_TZ', 'America/Santiago'),

  SESSION_SECRET: getEnv('SESSION_SECRET', 'dev_secret_change_me'),
  SESSION_MAX_AGE_HOURS: parseInt(getEnv('SESSION_MAX_AGE_HOURS', '12'), 10),
  COOKIE_SECURE: getEnv('COOKIE_SECURE', 'false') === 'true',

  LOGIN_MAX_ATTEMPTS: parseInt(getEnv('LOGIN_MAX_ATTEMPTS', '5'), 10),
  LOGIN_LOCK_MINUTES: parseInt(getEnv('LOGIN_LOCK_MINUTES', '10'), 10),

  DB_SERVER: getEnv('DB_SERVER', 'localhost'),
  DB_PORT: parseInt(getEnv('DB_PORT', '1433'), 10),
  DB_DATABASE: getEnv('DB_DATABASE', 'TodoSimpleDB'),
  DB_USER: getEnv('DB_USER', 'sa'),
  DB_PASSWORD: getEnv('DB_PASSWORD', ''),
  DB_ENCRYPT: getEnv('DB_ENCRYPT', 'false') === 'true',
  DB_TRUST_SERVER_CERT: getEnv('DB_TRUST_SERVER_CERT', 'true') === 'true',

  ADMIN_NAME: getEnv('ADMIN_NAME', 'Administrador'),
  ADMIN_EMAIL: getEnv('ADMIN_EMAIL', 'admin@empresa.cl'),
  ADMIN_PASSWORD: getEnv('ADMIN_PASSWORD', 'Admin123!')
};
