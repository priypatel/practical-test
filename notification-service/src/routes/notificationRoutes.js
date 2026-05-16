const router = require('express').Router();
const ctrl = require('../controllers/notificationController');

router.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() })
);
router.post('/', ctrl.create);

module.exports = router;
