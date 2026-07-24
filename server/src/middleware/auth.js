import jwt from 'jsonwebtoken';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const attachUserFromAuthHeader = (req) => {
  const auth = req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return false;
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    return true;
  } catch {
    req.user = null;
    return false;
  }
};

export const requireAuth = (req, res, next) => {
  const hasValidAuth = attachUserFromAuthHeader(req);
  if (!hasValidAuth) {
    return res.status(401).json({ error: true, message: 'Missing or invalid Authorization header' });
  }

  next();
};

export const optionalAuth = (req, _res, next) => {
  attachUserFromAuthHeader(req);
  next();
};
