const jwt = require('jsonwebtoken');
const logger = require('../logger');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Forward user identity to downstream services via header
    req.headers['x-user-id'] = payload.sub;
    req.headers['x-user-email'] = payload.email;
    req.headers['x-user-role'] = payload.role;
    next();
  } catch (err) {
    logger.warn('JWT verification failed', { error: err.message });
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { authenticate };
