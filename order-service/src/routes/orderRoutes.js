const router = require('express').Router();
const ctrl = require('../controllers/orderController');

router.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'order-service', timestamp: new Date().toISOString() })
);
router.post('/', ctrl.create);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);

module.exports = router;
