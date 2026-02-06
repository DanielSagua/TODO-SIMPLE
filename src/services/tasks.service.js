const { getPool, sql } = require('../config/db');

async function listTasksForUser(userId, filters = {}) {
  const pool = await getPool();
  const req = pool.request()
    .input('userId', sql.Int, userId);

  const where = ['t.is_deleted = 0'];

  if (filters.projectId) {
    req.input('projectId', sql.Int, filters.projectId);
    where.push('t.id_project = @projectId');
  }

  if (filters.statusId) {
    req.input('statusId', sql.Int, filters.statusId);
    where.push('t.id_status = @statusId');
  }

  if (filters.priorityId) {
    req.input('priorityId', sql.Int, filters.priorityId);
    where.push('t.id_priority = @priorityId');
  }

  if (filters.assignedTo === 'me') {
    where.push('t.assigned_user_id = @userId');
  } else if (filters.assignedTo === 'unassigned') {
    where.push('t.assigned_user_id IS NULL');
  }

  if (filters.search) {
    req.input('search', sql.NVarChar(200), `%${filters.search}%`);
    where.push('(t.title LIKE @search OR t.description LIKE @search)');
  }

  if (filters.due === 'today' && filters.todayStart && filters.todayEnd) {
    req.input('todayStart', sql.DateTimeOffset, filters.todayStart);
    req.input('todayEnd', sql.DateTimeOffset, filters.todayEnd);
    where.push('t.due_at_utc IS NOT NULL AND t.due_at_utc >= @todayStart AND t.due_at_utc <= @todayEnd');
  }

  if (filters.due === 'overdue' && filters.nowUtc) {
    req.input('nowUtc', sql.DateTimeOffset, filters.nowUtc);
    where.push('t.due_at_utc IS NOT NULL AND t.due_at_utc < @nowUtc');
  }

  const sqlQuery = `
    SELECT
      t.id_task, t.id_project, pr.nombre AS project_name,
      t.title, t.description,
      t.id_status, ts.nombre AS status_name, ts.is_final,
      t.id_priority, prio.nombre AS priority_name,
      t.due_at_utc, t.assigned_user_id,
      au.nombre AS assigned_name,
      t.created_by_user_id,
      t.created_at_utc, t.updated_at_utc, t.completed_at_utc
    FROM dbo.Tasks t
    JOIN dbo.Projects pr ON pr.id_project = t.id_project
    JOIN dbo.ProjectMembers pm ON pm.id_project = pr.id_project AND pm.id_user = @userId
    JOIN dbo.TaskStatuses ts ON ts.id_status = t.id_status
    JOIN dbo.Priorities prio ON prio.id_priority = t.id_priority
    LEFT JOIN dbo.Users au ON au.id_user = t.assigned_user_id
    WHERE ${where.join(' AND ')}
    ORDER BY
      CASE WHEN t.due_at_utc IS NULL THEN 1 ELSE 0 END,
      t.due_at_utc ASC,
      prio.sort_order DESC,
      t.created_at_utc DESC
  `;

  const r = await req.query(sqlQuery);
  return r.recordset;
}

async function createTask({ id_project, title, description, id_status, id_priority, due_at_utc, assigned_user_id, created_by_user_id }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('id_project', sql.Int, id_project)
    .input('title', sql.NVarChar(200), title)
    .input('description', sql.NVarChar(sql.MAX), description || null)
    .input('id_status', sql.Int, id_status)
    .input('id_priority', sql.Int, id_priority)
    .input('due_at_utc', sql.DateTimeOffset, due_at_utc || null)
    .input('assigned_user_id', sql.Int, assigned_user_id || null)
    .input('created_by_user_id', sql.Int, created_by_user_id)
    .query(`
      INSERT INTO dbo.Tasks(id_project, title, description, id_status, id_priority, due_at_utc, assigned_user_id, created_by_user_id)
      OUTPUT INSERTED.id_task
      VALUES (@id_project, @title, @description, @id_status, @id_priority, @due_at_utc, @assigned_user_id, @created_by_user_id)
    `);
  return r.recordset[0]?.id_task;
}

async function getTaskForUser(taskId, userId) {
  const pool = await getPool();
  const r = await pool.request()
    .input('taskId', sql.Int, taskId)
    .input('userId', sql.Int, userId)
    .query(`
      SELECT
        t.id_task, t.id_project, pr.nombre AS project_name,
        t.title, t.description,
        t.id_status, ts.nombre AS status_name, ts.is_final,
        t.id_priority, prio.nombre AS priority_name,
        t.due_at_utc, t.assigned_user_id,
        au.nombre AS assigned_name,
        t.created_by_user_id,
        t.created_at_utc, t.updated_at_utc, t.completed_at_utc
      FROM dbo.Tasks t
      JOIN dbo.Projects pr ON pr.id_project = t.id_project
      JOIN dbo.ProjectMembers pm ON pm.id_project = pr.id_project AND pm.id_user = @userId
      JOIN dbo.TaskStatuses ts ON ts.id_status = t.id_status
      JOIN dbo.Priorities prio ON prio.id_priority = t.id_priority
      LEFT JOIN dbo.Users au ON au.id_user = t.assigned_user_id
      WHERE t.id_task=@taskId AND t.is_deleted=0
    `);
  return r.recordset[0] || null;
}

async function updateTask(taskId, userId, { title, description, id_status, id_priority, due_at_utc, assigned_user_id, completed_at_utc }) {
  const pool = await getPool();
  const r = await pool.request()
    .input('taskId', sql.Int, taskId)
    .input('userId', sql.Int, userId)
    .input('title', sql.NVarChar(200), title)
    .input('description', sql.NVarChar(sql.MAX), description || null)
    .input('id_status', sql.Int, id_status)
    .input('id_priority', sql.Int, id_priority)
    .input('due_at_utc', sql.DateTimeOffset, due_at_utc || null)
    .input('assigned_user_id', sql.Int, assigned_user_id || null)
    .input('completed_at_utc', sql.DateTimeOffset, completed_at_utc || null)
    .query(`
      UPDATE t
      SET
        title=@title,
        description=@description,
        id_status=@id_status,
        id_priority=@id_priority,
        due_at_utc=@due_at_utc,
        assigned_user_id=@assigned_user_id,
        completed_at_utc=@completed_at_utc,
        updated_at_utc=SYSUTCDATETIME()
      FROM dbo.Tasks t
      JOIN dbo.ProjectMembers pm ON pm.id_project=t.id_project AND pm.id_user=@userId
      WHERE t.id_task=@taskId AND t.is_deleted=0
    `);
  return r.rowsAffected[0] > 0;
}

async function softDeleteTask(taskId, userId) {
  const pool = await getPool();
  const r = await pool.request()
    .input('taskId', sql.Int, taskId)
    .input('userId', sql.Int, userId)
    .query(`
      UPDATE t
      SET is_deleted=1, updated_at_utc=SYSUTCDATETIME()
      FROM dbo.Tasks t
      JOIN dbo.ProjectMembers pm ON pm.id_project=t.id_project AND pm.id_user=@userId
      WHERE t.id_task=@taskId AND t.is_deleted=0
    `);
  return r.rowsAffected[0] > 0;
}

module.exports = {
  listTasksForUser,
  createTask,
  getTaskForUser,
  updateTask,
  softDeleteTask
};
