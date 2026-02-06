const { getPool } = require('../config/db');

async function getStatuses() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT id_status, nombre, sort_order, is_final
    FROM dbo.TaskStatuses
    ORDER BY sort_order ASC
  `);
  return r.recordset;
}

async function getPriorities() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT id_priority, nombre, sort_order
    FROM dbo.Priorities
    ORDER BY sort_order ASC
  `);
  return r.recordset;
}

async function getDefaultStatusId() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT TOP 1 id_status FROM dbo.TaskStatuses WHERE is_default = 1 ORDER BY sort_order ASC
  `);
  return r.recordset?.[0]?.id_status ?? null;
}

async function getDefaultPriorityId() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT TOP 1 id_priority FROM dbo.Priorities WHERE is_default = 1 ORDER BY sort_order ASC
  `);
  return r.recordset?.[0]?.id_priority ?? null;
}

async function getFinalStatusId() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT TOP 1 id_status FROM dbo.TaskStatuses WHERE is_final = 1 ORDER BY sort_order DESC
  `);
  return r.recordset?.[0]?.id_status ?? null;
}

module.exports = {
  getStatuses,
  getPriorities,
  getDefaultStatusId,
  getDefaultPriorityId,
  getFinalStatusId
};
