const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid or inactive user' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireEmailVerified(req, res, next) {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({ error: 'Email not verified' });
  }
  next();
}

module.exports = { authMiddleware, requireRole, requireEmailVerified };
