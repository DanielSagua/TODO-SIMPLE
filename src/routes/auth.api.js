const express = require('express');
const env = require('../config/env');
const { comparePassword } = require('../utils/password');
const { DateTime } = require('luxon');
const { findByEmail, getUserRoles, updateLoginFailure, clearLoginFailures } = require('../services/users.service');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { correo, password } = req.body || {};
    if (!correo || !password) return res.status(400).json({ ok:false, message:'Correo y contraseña son obligatorios' });

    const user = await findByEmail(String(correo).trim());
    if (!user) return res.status(401).json({ ok:false, message:'Credenciales inválidas' });
    if (!user.activo) return res.status(403).json({ ok:false, message:'Usuario desactivado' });

    const lockedUntil = user.locked_until_utc ? DateTime.fromJSDate(new Date(user.locked_until_utc)).toUTC() : null;
    if (lockedUntil && lockedUntil > DateTime.utc()) {
      return res.status(429).json({ ok:false, message:'Usuario bloqueado temporalmente. Intenta más tarde.' });
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      const nextFails = (user.failed_attempts || 0) + 1;
      let lockedUntilUtc = null;

      if (nextFails >= env.LOGIN_MAX_ATTEMPTS) {
        lockedUntilUtc = DateTime.utc().plus({ minutes: env.LOGIN_LOCK_MINUTES }).toJSDate();
      }

      await updateLoginFailure(user.id_user, nextFails >= env.LOGIN_MAX_ATTEMPTS ? 0 : nextFails, lockedUntilUtc);
      return res.status(401).json({ ok:false, message:'Credenciales inválidas' });
    }

    await clearLoginFailures(user.id_user);

    const roles = await getUserRoles(user.id_user);
    const role = roles.includes('Admin') ? 'Admin' : 'User';

    req.session.user = {
      id_user: user.id_user,
      nombre: user.nombre,
      correo: user.correo,
      role
    };

    return res.json({ ok:true, user: req.session.user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, message:'Error al iniciar sesión' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok:true }));
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ ok:false, message:'No autenticado' });
  return res.json({ ok:true, user: req.session.user });
});

module.exports = router;
