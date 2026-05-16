const axios = require('axios');
const axiosRetry = require('axios-retry').default;

const client = axios.create({
  baseURL: process.env.PRODUCT_SERVICE_URL,
  timeout: 5000,
});

// Retry up to 3 times with exponential backoff on network errors or 5xx
axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    (err.response && err.response.status >= 500),
});

const getProduct = async (productId) => {
  const { data } = await client.get(`/${productId}`);
  return data;
};

module.exports = { getProduct };
