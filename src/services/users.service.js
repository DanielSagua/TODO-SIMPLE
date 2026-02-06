const { getPool, sql } = require('../config/db');

async function findByEmail(correo) {
  const pool = await getPool();
  const r = await pool.request()
    .input('correo', sql.NVarChar(150), correo)
    .query(`
      SELECT id_user, nombre, correo, password_hash, activo, failed_attempts, locked_until_utc
      FROM dbo.Users
      WHERE correo = @correo
    `);
  return r.recordset[0] || null;
}

async function getUserRoles(id_user) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_user', sql.Int, id_user)
    .query(`
      SELECT r.nombre
      FROM dbo.UserRoles ur
      JOIN dbo.Roles r ON r.id_role = ur.id_role
      WHERE ur.id_user = @id_user
    `);
  return r.recordset.map(x => x.nombre);
}

async function getRoleIdByName(nombre) {
  const pool = await getPool();
  const r = await pool.request()
    .input('nombre', sql.NVarChar(50), nombre)
    .query(`SELECT TOP 1 id_role FROM dbo.Roles WHERE nombre = @nombre`);
  return r.recordset?.[0]?.id_role ?? null;
}

async function assignRole(id_user, roleName) {
  const pool = await getPool();
  const roleId = await getRoleIdByName(roleName);
  if (!roleId) throw new Error(`Rol no existe: ${roleName}`);

  await pool.request()
    .input('id_user', sql.Int, id_user)
    .input('id_role', sql.Int, roleId)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.UserRoles WHERE id_user=@id_user AND id_role=@id_role)
      INSERT INTO dbo.UserRoles(id_user, id_role) VALUES (@id_user, @id_role)
    `);
}

async function createUser({ nombre, correo, password_hash, roleName = 'User' }) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const req = new sql.Request(tx);
    const insert = await req
      .input('nombre', sql.NVarChar(150), nombre)
      .input('correo', sql.NVarChar(150), correo)
      .input('password_hash', sql.NVarChar(255), password_hash)
      .query(`
        INSERT INTO dbo.Users(nombre, correo, password_hash)
        OUTPUT INSERTED.id_user, INSERTED.nombre, INSERTED.correo, INSERTED.activo
        VALUES (@nombre, @correo, @password_hash)
      `);
    const user = insert.recordset[0];

    const roleId = await (async () => {
      const r = await req
        .input('roleName', sql.NVarChar(50), roleName)
        .query(`SELECT TOP 1 id_role FROM dbo.Roles WHERE nombre=@roleName`);
      return r.recordset?.[0]?.id_role ?? null;
    })();

    if (!roleId) throw new Error('Rol inválido');

    await req
      .input('id_user', sql.Int, user.id_user)
      .input('id_role', sql.Int, roleId)
      .query(`INSERT INTO dbo.UserRoles(id_user, id_role) VALUES (@id_user, @id_role)`);

    await tx.commit();
    return user;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

async function listUsers() {
  const pool = await getPool();
  const r = await pool.request().query(`
    SELECT u.id_user, u.nombre, u.correo, u.activo,
      STRING_AGG(r.nombre, ',') WITHIN GROUP (ORDER BY r.nombre) AS roles
    FROM dbo.Users u
    LEFT JOIN dbo.UserRoles ur ON ur.id_user = u.id_user
    LEFT JOIN dbo.Roles r ON r.id_role = ur.id_role
    GROUP BY u.id_user, u.nombre, u.correo, u.activo
    ORDER BY u.nombre ASC
  `);
  return r.recordset;
}

async function setUserActive(id_user, activo) {
  const pool = await getPool();
  await pool.request()
    .input('id_user', sql.Int, id_user)
    .input('activo', sql.Bit, activo ? 1 : 0)
    .query(`UPDATE dbo.Users SET activo=@activo, updated_at_utc=SYSUTCDATETIME() WHERE id_user=@id_user`);
}

async function resetPassword(id_user, password_hash) {
  const pool = await getPool();
  await pool.request()
    .input('id_user', sql.Int, id_user)
    .input('password_hash', sql.NVarChar(255), password_hash)
    .query(`
      UPDATE dbo.Users
      SET password_hash=@password_hash, failed_attempts=0, locked_until_utc=NULL, updated_at_utc=SYSUTCDATETIME()
      WHERE id_user=@id_user
    `);
}

async function updateLoginFailure(id_user, failed_attempts, locked_until_utc) {
  const pool = await getPool();
  const req = pool.request()
    .input('id_user', sql.Int, id_user)
    .input('failed_attempts', sql.Int, failed_attempts);

  if (locked_until_utc) req.input('locked_until_utc', sql.DateTimeOffset, locked_until_utc);

  await req.query(`
    UPDATE dbo.Users
    SET failed_attempts=@failed_attempts,
        locked_until_utc=${locked_until_utc ? '@locked_until_utc' : 'NULL'},
        updated_at_utc=SYSUTCDATETIME()
    WHERE id_user=@id_user
  `);
}

async function clearLoginFailures(id_user) {
  const pool = await getPool();
  await pool.request()
    .input('id_user', sql.Int, id_user)
    .query(`
      UPDATE dbo.Users
      SET failed_attempts=0, locked_until_utc=NULL, updated_at_utc=SYSUTCDATETIME()
      WHERE id_user=@id_user
    `);
}

async function findUserBasicByEmail(email) {
  const pool = await getPool();
  const r = await pool.request()
    .input('correo', sql.NVarChar(150), email)
    .query(`SELECT TOP 1 id_user, nombre, correo, activo FROM dbo.Users WHERE correo=@correo`);
  return r.recordset[0] || null;
}

async function searchActiveUsers(q, limit = 10) {
  const pool = await getPool();
  const term = `%${q}%`;

  const r = await pool.request()
    .input('q', sql.NVarChar(150), term)
    .input('limit', sql.Int, limit)
    .query(`
      SELECT TOP (@limit)
        id_user, nombre, correo
      FROM dbo.Users
      WHERE activo = 1
        AND (nombre LIKE @q OR correo LIKE @q)
      ORDER BY nombre ASC
    `);

  return r.recordset;
}


module.exports = {
  findByEmail,
  getUserRoles,
  assignRole,
  createUser,
  listUsers,
  setUserActive,
  resetPassword,
  updateLoginFailure,
  clearLoginFailures,
  findUserBasicByEmail,
  searchActiveUsers
};
