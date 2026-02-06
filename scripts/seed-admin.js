const env = require('../src/config/env');
const { getPool, sql } = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');
const { findByEmail, assignRole } = require('../src/services/users.service');

(async () => {
  try {
    const email = String(env.ADMIN_EMAIL).trim().toLowerCase();
    const name = String(env.ADMIN_NAME).trim();
    const pass = String(env.ADMIN_PASSWORD);

    if (!email.includes('@')) throw new Error('ADMIN_EMAIL inválido en .env');
    if (!pass || pass.length < 6) throw new Error('ADMIN_PASSWORD inválido (mín 6)');

    const exists = await findByEmail(email);
    if (exists) {
      console.log(`Admin ya existe: ${email} (id_user=${exists.id_user}). Asignando rol Admin si falta...`);
      await assignRole(exists.id_user, 'Admin');
      console.log('OK');
      process.exit(0);
    }

    const password_hash = await hashPassword(pass);
    const pool = await getPool();

    const r = await pool.request()
      .input('nombre', sql.NVarChar(150), name)
      .input('correo', sql.NVarChar(150), email)
      .input('password_hash', sql.NVarChar(255), password_hash)
      .query(`
        INSERT INTO dbo.Users(nombre, correo, password_hash)
        OUTPUT INSERTED.id_user
        VALUES (@nombre, @correo, @password_hash)
      `);

    const id_user = r.recordset[0].id_user;
    await assignRole(id_user, 'Admin');

    console.log(`Admin creado OK: ${email} (id_user=${id_user})`);
    process.exit(0);
  } catch (e) {
    console.error('Error seed admin:', e.message);
    process.exit(1);
  }
})();
