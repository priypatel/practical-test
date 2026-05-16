const Order = require('../models/Order');
const productClient = require('./productClient');
const notificationClient = require('./notificationClient');

const createOrder = async (userId, items, idempotencyKey) => {
  // Duplicate prevention: return existing order if same idempotency key
  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) {
      const err = new Error('Duplicate order: idempotency key already used');
      err.status = 409;
      err.existing = existing;
      throw err;
    }
  }

  // Validate products via Product Service (order service never touches product DB)
  const resolvedItems = [];
  let totalAmount = 0;

  for (const item of items) {
    const product = await productClient.getProduct(item.productId);

    if (product.stock < item.quantity) {
      const err = new Error(`Insufficient stock for product: ${product.name}`);
      err.status = 422;
      throw err;
    }

    resolvedItems.push({
      productId: item.productId,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    });
    totalAmount += product.price * item.quantity;
  }

  const order = await Order.create({
    userId,
    items: resolvedItems,
    totalAmount,
    status: 'confirmed',
    idempotencyKey: idempotencyKey || undefined,
  });

  // Notify asynchronously — partial failure safe
  notificationClient.notify(order);

  return order;
};

const findByUser = (userId) => Order.find({ userId }).sort({ createdAt: -1 });

const findById = async (id, userId) => {
  const order = await Order.findOne({ _id: id, userId });
  if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
  return order;
};

module.exports = { createOrder, findByUser, findById };
