const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });

const register = async (email, password, role = 'user') => {
  const existing = await User.findOne({ email });
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash, role });

  const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role });
  return { token, user: { id: user._id, email: user.email, role: user.role } };
};

const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const token = signToken({ sub: user._id.toString(), email: user.email, role: user.role });
  return { token, user: { id: user._id, email: user.email, role: user.role } };
};

module.exports = { register, login };
