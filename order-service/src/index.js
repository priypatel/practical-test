require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const logger = require('./logger');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
app.use(express.json());

app.use('/', orderRoutes);

const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => logger.info(`Order service running on port ${PORT}`));
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  });
