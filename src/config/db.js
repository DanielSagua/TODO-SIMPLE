const sql = require('mssql');
const env = require('./env');

let pool;

async function getPool() {
  if (pool) return pool;

  pool = await sql.connect({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    database: env.DB_DATABASE,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERT
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  });

  return pool;
}

module.exports = { sql, getPool };
