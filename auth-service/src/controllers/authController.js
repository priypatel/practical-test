const authService = require('../services/authService');
const logger = require('../logger');

const register = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const result = await authService.register(email, password, role);
    res.status(201).json(result);
  } catch (err) {
    logger.error('Register error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Login error', { message: err.message });
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { register, login };
