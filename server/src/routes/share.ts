import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateShareToken } from '../services/share.service';
import { prisma } from '../lib/prisma';

const router = Router();

// Rate-limit the public share endpoint per IP to prevent scraping and token brute-force
const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please try again later.',
});

/** GET /share/:token — public read-only medication list web view */
router.get('/:token', shareLimiter, async (req, res, next) => {
  try {
    const patientId = await validateShareToken(req.params.token);
    if (!patientId) {
      res.status(404).render('share', { error: 'This link is invalid or has expired.', patient: null });
      return;
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!patient) {
      res.status(404).render('share', { error: 'Patient not found.', patient: null });
      return;
    }

    const lastUpdated = patient.medications.length > 0
      ? patient.medications.reduce((latest, m) =>
          m.updatedAt > latest ? m.updatedAt : latest, patient.medications[0].updatedAt)
      : patient.updatedAt;

    res.render('share', {
      error: null,
      patient,
      lastUpdated,
      generatedAt: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }),
      shareToken: req.params.token,
    });
  } catch (err) { next(err); }
});

export default router;
