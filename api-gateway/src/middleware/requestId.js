const { v4: uuidv4 } = require('uuid');

// Distributed tracing concept: every request gets a unique ID forwarded to all services
const attachRequestId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

module.exports = { attachRequestId };
