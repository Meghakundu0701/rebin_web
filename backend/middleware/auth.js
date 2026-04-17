const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const token = req.headers['authorization'] || req.headers['Authorization'];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
