const path = require('path');
const express = require('express');
const { requireWebAuth } = require('../middlewares/auth');
const { requireWebRole } = require('../middlewares/role');

const router = express.Router();
const pagesDir = path.join(__dirname, '..', 'pages');

router.get('/login', (req, res) => res.sendFile(path.join(pagesDir, 'login.html')));
router.get('/', requireWebAuth, (req, res) => res.sendFile(path.join(pagesDir, 'dashboard.html')));
router.get('/projects', requireWebAuth, (req, res) => res.sendFile(path.join(pagesDir, 'projects.html')));
router.get('/projects/:id', requireWebAuth, (req, res) => res.sendFile(path.join(pagesDir, 'project-detail.html')));
router.get('/profile', requireWebAuth, (req, res) => res.sendFile(path.join(pagesDir, 'profile.html')));
router.get('/admin/users', requireWebAuth, requireWebRole('Admin'), (req, res) => res.sendFile(path.join(pagesDir, 'admin-users.html')));

module.exports = router;
