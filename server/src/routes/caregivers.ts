import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { stripHtml } from '../lib/sanitize';

const router = Router();
router.use(requireAuth);

/** PATCH /api/caregivers/:id — update permission level or relationship */
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const relation = await prisma.caregiverPatient.findUnique({ where: { id: req.params.id } });
    if (!relation) { res.status(404).json({ error: 'Caregiver relation not found' }); return; }

    // Only ADMIN of the patient can change permissions
    const isAdmin = await prisma.caregiverPatient.findFirst({
      where: { patientId: relation.patientId, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!isAdmin) { res.status(403).json({ error: 'Admin permission required' }); return; }

    const { permissionLevel, relationship } = req.body;
    const validLevels = ['ADMIN', 'VIEW_ONLY'];
    if (permissionLevel && !validLevels.includes(permissionLevel)) {
      res.status(400).json({ error: 'permissionLevel must be ADMIN or VIEW_ONLY' }); return;
    }
    if (relationship !== undefined && typeof relationship === 'string' && relationship.length > 100) {
      res.status(400).json({ error: 'relationship must be 100 characters or fewer' }); return;
    }
    const updated = await prisma.caregiverPatient.update({
      where: { id: req.params.id },
      data: {
        ...(permissionLevel && { permissionLevel }),
        ...(relationship !== undefined && { relationship: relationship ? stripHtml(relationship) : relationship }),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

/** DELETE /api/caregivers/:id — remove a caregiver from a patient */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const relation = await prisma.caregiverPatient.findUnique({ where: { id: req.params.id } });
    if (!relation) { res.status(404).json({ error: 'Not found' }); return; }

    const isAdmin = await prisma.caregiverPatient.findFirst({
      where: { patientId: relation.patientId, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!isAdmin) { res.status(403).json({ error: 'Admin permission required' }); return; }

    // Deactivate any share links this caregiver created for this patient
    await prisma.$transaction([
      prisma.shareLink.updateMany({
        where: { patientId: relation.patientId, createdById: relation.caregiverId },
        data: { isActive: false },
      }),
      prisma.caregiverPatient.delete({ where: { id: req.params.id } }),
    ]);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
