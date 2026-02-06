function requireRole(roleName) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ ok: false, message: 'No autenticado' });
    if (user.role !== roleName) return res.status(403).json({ ok: false, message: 'No autorizado' });
    return next();
  };
}

function requireWebRole(roleName) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (!user) return res.redirect('/login');
    if (user.role !== roleName) return res.status(403).send('No autorizado');
    return next();
  };
}

module.exports = { requireRole, requireWebRole };
