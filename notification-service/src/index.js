require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const logger = require('./logger');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
app.use(express.json());

app.use('/', notificationRoutes);

const PORT = process.env.PORT || 3004;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    app.listen(PORT, () => logger.info(`Notification service running on port ${PORT}`));
  })
  .catch((err) => {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  });
