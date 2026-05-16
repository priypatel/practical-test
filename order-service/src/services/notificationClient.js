const axios = require('axios');
const logger = require('../logger');

const notify = (order) => {
  // Fire-and-forget: order creation succeeds even if notification service is down
  axios
    .post(`${process.env.NOTIFICATION_SERVICE_URL}/`, {
      orderId: order._id,
      userId: order.userId,
      type: 'ORDER_CREATED',
      message: `Order ${order._id} confirmed. Total: $${order.totalAmount.toFixed(2)}`,
    })
    .catch((err) => {
      logger.warn('Notification service unreachable', { error: err.message, orderId: order._id });
    });
};

module.exports = { notify };
