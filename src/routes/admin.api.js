const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { requireRole } = require('../middlewares/role');
const { listUsers, createUser, setUserActive, resetPassword } = require('../services/users.service');
const { hashPassword } = require('../utils/password');

const router = express.Router();

router.get('/admin/users', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ ok:true, users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al listar usuarios' });
  }
});

router.post('/admin/users', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const { nombre, correo, password, roleName } = req.body || {};
    const n = String(nombre || '').trim();
    const c = String(correo || '').trim();
    const p = String(password || '');

    if (n.length < 2) return res.status(400).json({ ok:false, message:'Nombre inválido' });
    if (!c.includes('@')) return res.status(400).json({ ok:false, message:'Correo inválido' });
    if (p.length < 6) return res.status(400).json({ ok:false, message:'Contraseña muy corta (mín 6)' });

    const password_hash = await hashPassword(p);
    const user = await createUser({ nombre: n, correo: c, password_hash, roleName: roleName === 'Admin' ? 'Admin' : 'User' });
    res.json({ ok:true, user });
  } catch (e) {
    console.error(e);
    if (String(e.message || '').toLowerCase().includes('unique') || String(e.message || '').toLowerCase().includes('ux_users_correo')) {
      return res.status(409).json({ ok:false, message:'Ese correo ya existe' });
    }
    res.status(500).json({ ok:false, message:'Error al crear usuario' });
  }
});

router.patch('/admin/users/:id/active', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const id_user = parseInt(req.params.id, 10);
    const { activo } = req.body || {};
    await setUserActive(id_user, !!activo);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al cambiar estado' });
  }
});

router.patch('/admin/users/:id/reset-password', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const id_user = parseInt(req.params.id, 10);
    const { newPassword } = req.body || {};
    const p = String(newPassword || '');
    if (p.length < 6) return res.status(400).json({ ok:false, message:'Contraseña muy corta (mín 6)' });

    const password_hash = await hashPassword(p);
    await resetPassword(id_user, password_hash);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al resetear contraseña' });
  }
});

module.exports = router;
