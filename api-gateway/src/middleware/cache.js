const axios = require('axios');
const redis = require('../redis');
const logger = require('../logger');

const TTL = parseInt(process.env.CACHE_TTL_SECONDS || '60', 10);

// For product GETs: check Redis first, fetch directly from product service on miss, then cache
const cachedProductFetch = async (req, res) => {
  const key = `cache:${req.originalUrl}`;
  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.info('Cache hit', { url: req.originalUrl });
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    logger.warn('Redis cache read failed', { error: err.message });
  }

  try {
    const strippedPath = req.originalUrl.replace(/^\/api\/products/, '') || '/';
    const upstream = `${process.env.PRODUCT_SERVICE_URL}${strippedPath}`;
    const { data } = await axios.get(upstream, { timeout: 5000 });

    redis.setex(key, TTL, JSON.stringify(data)).catch(() => {});
    res.setHeader('X-Cache', 'MISS');
    res.json(data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ message: err.response?.data?.message || 'Product service error' });
  }
};

// Invalidate product cache on writes
const invalidateProductCache = async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      try {
        const keys = await redis.keys('cache:/api/products*');
        if (keys.length) {
          await redis.del(...keys);
          logger.info('Product cache invalidated', { count: keys.length });
        }
      } catch (err) {
        logger.warn('Cache invalidation failed', { error: err.message });
      }
    }
  });
  next();
};

module.exports = { cachedProductFetch, invalidateProductCache };
