const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require('../middleware/auth');
const { cachedProductFetch, invalidateProductCache } = require('../middleware/cache');

const proxy = (target, prefix) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^/api/${prefix}`]: '' },
    onError: (err, req, res) => {
      res.status(502).json({ message: 'Service unavailable', error: err.message });
    },
  });

const registerRoutes = (app) => {
  // Auth routes — public, no JWT required
  app.use('/api/auth', proxy(process.env.AUTH_SERVICE_URL, 'auth'));

  // Product GET — served directly with Redis cache (MISS fetches from upstream, stores in Redis)
  app.get('/api/products', cachedProductFetch);
  app.get('/api/products/:id', cachedProductFetch);

  // Product writes — require auth, invalidate cache, then proxy
  app.use('/api/products', authenticate, invalidateProductCache, proxy(process.env.PRODUCT_SERVICE_URL, 'products'));

  // Order routes — all require JWT
  app.use('/api/orders', authenticate, proxy(process.env.ORDER_SERVICE_URL, 'orders'));

  // Notification routes — internal use (protected)
  app.use('/api/notifications', authenticate, proxy(process.env.NOTIFICATION_SERVICE_URL, 'notifications'));
};

module.exports = { registerRoutes };
