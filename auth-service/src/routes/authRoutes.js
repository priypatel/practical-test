const router = require('express').Router();
const { register, login } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() })
);

module.exports = router;
