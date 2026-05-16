const notificationService = require('../services/notificationService');
const logger = require('../logger');

const create = async (req, res) => {
  try {
    const { orderId, userId, type, message } = req.body;
    if (!orderId || !userId || !type || !message) {
      return res.status(400).json({ message: 'orderId, userId, type, and message are required' });
    }
    const notification = await notificationService.create({ orderId, userId, type, message });
    res.status(201).json(notification);
  } catch (err) {
    logger.error('Notification create error', { message: err.message });
    res.status(500).json({ message: err.message });
  }
};

module.exports = { create };
