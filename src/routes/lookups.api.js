const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { getStatuses, getPriorities } = require('../services/lookups.service');

const router = express.Router();

router.get('/lookups', requireAuth, async (req, res) => {
  try {
    const [statuses, priorities] = await Promise.all([getStatuses(), getPriorities()]);
    res.json({ ok:true, statuses, priorities });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al cargar catálogos' });
  }
});

module.exports = router;
