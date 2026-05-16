const router = require('express').Router();
const ctrl = require('../controllers/productController');

router.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'product-service', timestamp: new Date().toISOString() })
);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
