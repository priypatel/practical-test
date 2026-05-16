require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const logger = require('./logger');
const { limiter } = require('./middleware/rateLimiter');
const { attachRequestId } = require('./middleware/requestId');
const { registerRoutes } = require('./routes/proxy');

const app = express();

// Middleware order matters: request ID → rate limit → logging → routes
app.use(attachRequestId);
app.use(limiter);
app.use(morgan('combined'));

// Gateway health check — does not proxy to any service
app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    upstreams: {
      auth: process.env.AUTH_SERVICE_URL,
      product: process.env.PRODUCT_SERVICE_URL,
      order: process.env.ORDER_SERVICE_URL,
      notification: process.env.NOTIFICATION_SERVICE_URL,
    },
  })
);

registerRoutes(app);

// 404 fallback
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`API Gateway running on port ${PORT}`));
