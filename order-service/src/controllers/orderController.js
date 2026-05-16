const orderService = require('../services/orderService');
const logger = require('../logger');

const create = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const idempotencyKey = req.headers['x-idempotency-key'];
    const { items } = req.body;

    if (!userId) return res.status(401).json({ message: 'Missing user identity' });
    if (!items || !items.length) return res.status(400).json({ message: 'Order items are required' });

    const order = await orderService.createOrder(userId, items, idempotencyKey);
    res.status(201).json(order);
  } catch (err) {
    if (err.status === 409 && err.existing) {
      return res.status(409).json({ message: err.message, order: err.existing });
    }
    logger.error('Create order error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getAll = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Missing user identity' });

    const orders = await orderService.findByUser(userId);
    res.json(orders);
  } catch (err) {
    logger.error('Get orders error', { message: err.message });
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ message: 'Missing user identity' });

    const order = await orderService.findById(req.params.id, userId);
    res.json(order);
  } catch (err) {
    logger.error('Get order error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { create, getAll, getOne };
