const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { listTasksForUser, createTask, getTaskForUser, updateTask, softDeleteTask } = require('../services/tasks.service');
const { getProjectForUser, isMember } = require('../services/projects.service');
const { getDefaultStatusId, getDefaultPriorityId, getFinalStatusId } = require('../services/lookups.service');
const { todayRangeUtc, dueDateToUtcJsDate, nowUtcJsDate } = require('../utils/time');

const router = express.Router();

router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id_user;

    const projectId = req.query.projectId ? parseInt(req.query.projectId, 10) : null;
    const statusId = req.query.statusId ? parseInt(req.query.statusId, 10) : null;
    const priorityId = req.query.priorityId ? parseInt(req.query.priorityId, 10) : null;
    const assignedTo = req.query.assignedTo ? String(req.query.assignedTo) : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const due = req.query.due ? String(req.query.due) : null;

    let todayStart, todayEnd;
    if (due === 'today') {
      const r = todayRangeUtc();
      todayStart = r.start;
      todayEnd = r.end;
    }

    const tasks = await listTasksForUser(userId, {
      projectId,
      statusId,
      priorityId,
      assignedTo,
      search,
      due,
      todayStart,
      todayEnd,
      nowUtc: due === 'overdue' ? nowUtcJsDate() : null
    });

    res.json({ ok: true, tasks });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al listar tareas' });
  }
});

router.post('/tasks', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id_user;
    const { id_project, title, description, id_status, id_priority, due_date, assigned_user_id } = req.body || {};

    const projectId = parseInt(id_project, 10);
    if (!projectId) return res.status(400).json({ ok: false, message: 'Proyecto requerido' });

    const project = await getProjectForUser(projectId, userId);
    if (!project) return res.status(403).json({ ok: false, message: 'No autorizado para este proyecto' });

    const t = String(title || '').trim();
    if (t.length < 2) return res.status(400).json({ ok: false, message: 'Título inválido' });

    const status = id_status ? parseInt(id_status, 10) : (await getDefaultStatusId());
    const priority = id_priority ? parseInt(id_priority, 10) : (await getDefaultPriorityId());
    if (!status || !priority) return res.status(500).json({ ok: false, message: 'Catálogos no configurados (status/prioridad)' });

    const dueUtc = dueDateToUtcJsDate(due_date || null);
    const assigned = assigned_user_id ? parseInt(assigned_user_id, 10) : null;
    if (assigned && !(await isMember(projectId, assigned))) {
      return res.status(400).json({ ok: false, message: 'El usuario asignado no pertenece al proyecto' });
    }

    const newId = await createTask({
      id_project: projectId,
      title: t,
      description: description ? String(description).trim() : null,
      id_status: status,
      id_priority: priority,
      due_at_utc: dueUtc,
      assigned_user_id: assigned,
      created_by_user_id: userId
    });

    res.json({ ok: true, id_task: newId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al crear tarea' });
  }
});

router.get('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const task = await getTaskForUser(taskId, req.session.user.id_user);
    if (!task) return res.status(404).json({ ok: false, message: 'Tarea no encontrada' });
    res.json({ ok: true, task });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al obtener tarea' });
  }
});

router.patch('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id_user;
    const taskId = parseInt(req.params.id, 10);

    const existing = await getTaskForUser(taskId, userId);
    if (!existing) return res.status(404).json({ ok: false, message: 'Tarea no encontrada' });

    const { title, description, id_status, id_priority, due_date, assigned_user_id } = req.body || {};
    const t = String(title || '').trim();
    if (t.length < 2) return res.status(400).json({ ok: false, message: 'Título inválido' });

    const status = parseInt(id_status, 10);
    const priority = parseInt(id_priority, 10);
    if (!status || !priority) return res.status(400).json({ ok: false, message: 'Status/Prioridad requeridos' });

    const dueUtc = dueDateToUtcJsDate(due_date || null);
    const assigned = assigned_user_id ? parseInt(assigned_user_id, 10) : null;
    if (assigned && !(await isMember(existing.id_project, assigned))) {
      return res.status(400).json({ ok: false, message: 'El usuario asignado no pertenece al proyecto' });
    }

    const finalStatusId = await getFinalStatusId();
    const completedAtUtc = (finalStatusId && status === finalStatusId) ? nowUtcJsDate() : null;

    const updated = await updateTask(taskId, userId, {
      title: t,
      description: description ? String(description).trim() : null,
      id_status: status,
      id_priority: priority,
      due_at_utc: dueUtc,
      assigned_user_id: assigned,
      completed_at_utc: completedAtUtc
    });

    res.json({ ok: true, updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al actualizar tarea' });
  }
});

router.delete('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const deleted = await softDeleteTask(taskId, req.session.user.id_user);
    res.json({ ok: true, deleted });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al eliminar tarea' });
  }
});

module.exports = router;
