const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { listProjectsForUser, createProject, getProjectForUser, updateProject, archiveProject, listMembers, addMemberByUserId, removeMember, isMember } = require('../services/projects.service');
const { findUserBasicByEmail } = require('../services/users.service');

const router = express.Router();

router.get('/projects', requireAuth, async (req, res) => {
  try {
    const projects = await listProjectsForUser(req.session.user.id_user);
    res.json({ ok: true, projects });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al listar proyectos' });
  }
});

router.post('/projects', requireAuth, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) return res.status(400).json({ ok: false, message: 'Nombre de proyecto inválido' });

    const project = await createProject({
      nombre: String(nombre).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      owner_user_id: req.session.user.id_user
    });

    res.json({ ok: true, project });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al crear proyecto' });
  }
});

router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const id_project = parseInt(req.params.id, 10);
    const project = await getProjectForUser(id_project, req.session.user.id_user);
    if (!project) return res.status(404).json({ ok: false, message: 'Proyecto no encontrado' });
    res.json({ ok: true, project });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al obtener proyecto' });
  }
});

router.patch('/projects/:id', requireAuth, async (req, res) => {
  try {
    const id_project = parseInt(req.params.id, 10);
    const project = await getProjectForUser(id_project, req.session.user.id_user);
    if (!project) return res.status(404).json({ ok: false, message: 'Proyecto no encontrado' });

    const ownerOk = project.owner_user_id === req.session.user.id_user;
    const adminOk = req.session.user.role === 'Admin';
    if (!ownerOk && !adminOk) return res.status(403).json({ ok: false, message: 'No autorizado' });

    const { nombre, descripcion } = req.body || {};
    if (!nombre || String(nombre).trim().length < 2) return res.status(400).json({ ok: false, message: 'Nombre inválido' });

    await updateProject(id_project, { nombre: String(nombre).trim(), descripcion: descripcion ? String(descripcion).trim() : null });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al actualizar proyecto' });
  }
});

router.delete('/projects/:id', requireAuth, async (req, res) => {
  try {
    const id_project = parseInt(req.params.id, 10);
    const project = await getProjectForUser(id_project, req.session.user.id_user);
    if (!project) return res.status(404).json({ ok: false, message: 'Proyecto no encontrado' });

    const ownerOk = project.owner_user_id === req.session.user.id_user;
    const adminOk = req.session.user.role === 'Admin';
    if (!ownerOk && !adminOk) return res.status(403).json({ ok: false, message: 'No autorizado' });

    await archiveProject(id_project);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al archivar proyecto' });
  }
});

router.get('/projects/:id/members', requireAuth, async (req, res) => {
  try {
    const id_project = parseInt(req.params.id, 10);
    const project = await getProjectForUser(id_project, req.session.user.id_user);
    if (!project) return res.status(404).json({ ok: false, message: 'Proyecto no encontrado' });

    const members = await listMembers(id_project);
    res.json({ ok: true, members });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al listar miembros' });
  }
});

router.post('/projects/:id/members', requireAuth, async (req, res) => {
  try {
    const id_project = parseInt(req.params.id, 10);
    const project = await getProjectForUser(id_project, req.session.user.id_user);
    if (!project) return res.status(404).json({ ok: false, message: 'Proyecto no encontrado' });

    const ownerOk = project.owner_user_id === req.session.user.id_user;
    const adminOk = req.session.user.role === 'Admin';
    if (!ownerOk && !adminOk) return res.status(403).json({ ok: false, message: 'No autorizado' });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, message: 'Email requerido' });

    const user = await findUserBasicByEmail(String(email).trim());
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    if (!user.activo) return res.status(400).json({ ok: false, message: 'Usuario desactivado' });

    await addMemberByUserId(id_project, user.id_user, 'Member');
    res.json({ ok: true });

    if (await isMember(id_project, user.id_user)) {
      return res.status(409).json({ ok: false, message: 'Ese usuario ya pertenece al proyecto' });
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al agregar miembro' });
  }
});

router.delete('/projects/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const id_project = parseInt(req.params.id, 10);
    const project = await getProjectForUser(id_project, req.session.user.id_user);
    if (!project) return res.status(404).json({ ok: false, message: 'Proyecto no encontrado' });

    const ownerOk = project.owner_user_id === req.session.user.id_user;
    const adminOk = req.session.user.role === 'Admin';
    if (!ownerOk && !adminOk) return res.status(403).json({ ok: false, message: 'No autorizado' });

    const targetUserId = parseInt(req.params.userId, 10);
    const removed = await removeMember(id_project, targetUserId);
    res.json({ ok: true, removed });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al quitar miembro' });
  }
});

module.exports = router;
