import { Router } from 'express';
import { validateShareToken } from '../services/share.service';
import { prisma } from '../lib/prisma';

const router = Router();

/** GET /share/:token — public read-only medication list web view */
router.get('/:token', async (req, res, next) => {
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
    });
  } catch (err) { next(err); }
});

export default router;
