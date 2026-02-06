const { getPool, sql } = require('../config/db');

async function listProjectsForUser(id_user) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_user', sql.Int, id_user)
    .query(`
      SELECT p.id_project, p.nombre, p.descripcion, p.owner_user_id, p.activo,
             pm.member_role
      FROM dbo.Projects p
      JOIN dbo.ProjectMembers pm ON pm.id_project = p.id_project
      WHERE pm.id_user = @id_user AND p.activo = 1
      ORDER BY p.nombre ASC
    `);
  return r.recordset;
}

async function createProject({ nombre, descripcion, owner_user_id }) {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const req = new sql.Request(tx);
    const ins = await req
      .input('nombre', sql.NVarChar(150), nombre)
      .input('descripcion', sql.NVarChar(400), descripcion || null)
      .input('owner_user_id', sql.Int, owner_user_id)
      .query(`
        INSERT INTO dbo.Projects(nombre, descripcion, owner_user_id)
        OUTPUT INSERTED.id_project, INSERTED.nombre, INSERTED.descripcion, INSERTED.owner_user_id
        VALUES (@nombre, @descripcion, @owner_user_id)
      `);

    const project = ins.recordset[0];

    await req
      .input('id_project', sql.Int, project.id_project)
      .input('id_user', sql.Int, owner_user_id)
      .input('member_role', sql.NVarChar(30), 'Owner')
      .query(`
        INSERT INTO dbo.ProjectMembers(id_project, id_user, member_role)
        VALUES (@id_project, @id_user, @member_role)
      `);

    await tx.commit();
    return project;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

async function getProjectForUser(id_project, id_user) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_project', sql.Int, id_project)
    .input('id_user', sql.Int, id_user)
    .query(`
      SELECT p.id_project, p.nombre, p.descripcion, p.owner_user_id, p.activo, pm.member_role
      FROM dbo.Projects p
      JOIN dbo.ProjectMembers pm ON pm.id_project = p.id_project
      WHERE p.id_project=@id_project AND pm.id_user=@id_user AND p.activo=1
    `);
  return r.recordset[0] || null;
}

async function updateProject(id_project, { nombre, descripcion }) {
  const pool = await getPool();
  await pool.request()
    .input('id_project', sql.Int, id_project)
    .input('nombre', sql.NVarChar(150), nombre)
    .input('descripcion', sql.NVarChar(400), descripcion || null)
    .query(`
      UPDATE dbo.Projects
      SET nombre=@nombre, descripcion=@descripcion, updated_at_utc=SYSUTCDATETIME()
      WHERE id_project=@id_project
    `);
  return true;
}

async function archiveProject(id_project) {
  const pool = await getPool();
  await pool.request()
    .input('id_project', sql.Int, id_project)
    .query(`
      UPDATE dbo.Projects
      SET activo=0, updated_at_utc=SYSUTCDATETIME()
      WHERE id_project=@id_project
    `);
  return true;
}

async function listMembers(id_project) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_project', sql.Int, id_project)
    .query(`
      SELECT pm.id_user, u.nombre, u.correo, pm.member_role
      FROM dbo.ProjectMembers pm
      JOIN dbo.Users u ON u.id_user = pm.id_user
      WHERE pm.id_project=@id_project
      ORDER BY pm.member_role DESC, u.nombre ASC
    `);
  return r.recordset;
}

async function addMemberByUserId(id_project, id_user, member_role = 'Member') {
  const pool = await getPool();
  await pool.request()
    .input('id_project', sql.Int, id_project)
    .input('id_user', sql.Int, id_user)
    .input('member_role', sql.NVarChar(30), member_role)
    .query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.ProjectMembers WHERE id_project=@id_project AND id_user=@id_user)
      INSERT INTO dbo.ProjectMembers(id_project, id_user, member_role) VALUES (@id_project, @id_user, @member_role)
    `);
}

async function removeMember(id_project, id_user) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_project', sql.Int, id_project)
    .input('id_user', sql.Int, id_user)
    .query(`
      DELETE FROM dbo.ProjectMembers
      WHERE id_project=@id_project AND id_user=@id_user AND member_role <> 'Owner'
    `);
  return r.rowsAffected[0] > 0;
}

async function isMember(id_project, id_user) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_project', sql.Int, id_project)
    .input('id_user', sql.Int, id_user)
    .query(`
      SELECT TOP 1 1 AS ok
      FROM dbo.ProjectMembers
      WHERE id_project=@id_project AND id_user=@id_user
    `);

  return !!r.recordset[0];
}


module.exports = {
  listProjectsForUser,
  createProject,
  getProjectForUser,
  updateProject,
  archiveProject,
  listMembers,
  addMemberByUserId,
  removeMember,
  isMember
};
