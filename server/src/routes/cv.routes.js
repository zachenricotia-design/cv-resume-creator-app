import express from 'express';
import rateLimit from 'express-rate-limit';
import { createCV, getCV, updateCV, deleteCV, claimCV } from '../controllers/cv.controller.js';
import { exportCVPreview, exportSavedCV } from '../controllers/export.controller.js';
import { validateCVBody, validateCVIdParam } from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

const createLimiter = rateLimit({
  windowMs: 1000 * 60 * 60,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: true, message: 'Too many requests. Please try again later.' });
  },
});

const previewLimiter = rateLimit({
  windowMs: 1000 * 60 * 60,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: true, message: 'Too many preview requests. Please try again later.' });
  },
});

const exportLimiter = rateLimit({
  windowMs: 1000 * 60 * 60,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: true, message: 'Too many export requests. Please try again later.' });
  },
});

router.post('/', createLimiter, validateCVBody, createCV);
router.post('/export', previewLimiter, validateCVBody, exportCVPreview);
router.post('/:id/export', optionalAuth, validateCVIdParam, exportLimiter, exportSavedCV);
router.get('/:id', optionalAuth, validateCVIdParam, getCV);
router.put('/:id', optionalAuth, validateCVIdParam, validateCVBody, updateCV);
router.delete('/:id', optionalAuth, validateCVIdParam, deleteCV);

// Claim endpoint: user claims an anonymous CV using X-CV-Access-Token and auth JWT
router.post('/:id/claim', validateCVIdParam, requireAuth, claimCV);

export default router;
