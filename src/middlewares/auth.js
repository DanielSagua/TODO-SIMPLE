function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ ok: false, message: 'No autenticado' });
}

function requireWebAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

module.exports = { requireAuth, requireWebAuth };
