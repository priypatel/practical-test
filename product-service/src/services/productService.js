const Product = require('../models/Product');

const findAll = () => Product.find().sort({ createdAt: -1 });

const findById = async (id) => {
  const product = await Product.findById(id);
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  return product;
};

const create = (data) => Product.create(data);

const update = async (id, data) => {
  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  return product;
};

const remove = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) throw Object.assign(new Error('Product not found'), { status: 404 });
  return product;
};

module.exports = { findAll, findById, create, update, remove };
