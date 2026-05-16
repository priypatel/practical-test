const productService = require('../services/productService');
const logger = require('../logger');

const getAll = async (req, res) => {
  try {
    const products = await productService.findAll();
    res.json(products);
  } catch (err) {
    logger.error('getAll error', { message: err.message });
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const product = await productService.findById(req.params.id);
    res.json(product);
  } catch (err) {
    logger.error('getOne error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    logger.error('create error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    logger.error('update error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    logger.error('remove error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
