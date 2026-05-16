const Notification = require('../models/Notification');
const logger = require('../logger');

const create = async ({ orderId, userId, type, message }) => {
  const notification = await Notification.create({ orderId, userId, type, message });

  // Simulate sending email/SMS — in production, call an email/SMS provider here
  logger.info('Notification dispatched', { orderId, userId, type, message });

  return notification;
};

module.exports = { create };
