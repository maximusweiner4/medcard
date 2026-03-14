import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(requireAuth);

async function assertAccess(medicationId: string, userId: string, requireAdmin = false) {
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!med) return null;
  const relation = await prisma.caregiverPatient.findFirst({
    where: {
      patientId: med.patientId,
      caregiverId: userId,
      ...(requireAdmin ? { permissionLevel: 'ADMIN' } : {}),
    },
  });
  return relation ? med : null;
}

/** GET /api/medications/:id */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const med = await assertAccess(req.params.id, req.userId!);
    if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }
    res.json(med);
  } catch (err) { next(err); }
});

/** PATCH /api/medications/:id — edit medication fields */
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Medication not found or insufficient permission' }); return; }

    const {
      dose, form, route, frequency, instructions, prescriber,
      pharmacy, pillColor, pillShape, pillImprint, pillImageUrl, bottlePhotoUrl,
    } = req.body;

    const updated = await prisma.medication.update({
      where: { id: req.params.id },
      data: {
        ...(dose !== undefined && { dose }),
        ...(form !== undefined && { form }),
        ...(route !== undefined && { route }),
        ...(frequency !== undefined && { frequency }),
        ...(instructions !== undefined && { instructions }),
        ...(prescriber !== undefined && { prescriber }),
        ...(pharmacy !== undefined && { pharmacy }),
        ...(pillColor !== undefined && { pillColor }),
        ...(pillShape !== undefined && { pillShape }),
        ...(pillImprint !== undefined && { pillImprint }),
        ...(pillImageUrl !== undefined && { pillImageUrl }),
        ...(bottlePhotoUrl !== undefined && { bottlePhotoUrl }),
      },
    });

    await prisma.medicationChangeLog.create({
      data: {
        medicationId: req.params.id,
        changedById: req.userId!,
        changeType: 'UPDATED',
        previousValues: existing as any,
        newValues: updated as any,
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

/** PATCH /api/medications/:id/stop — mark inactive */
router.patch('/:id/stop', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Not found or insufficient permission' }); return; }

    const updated = await prisma.medication.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    await prisma.medicationChangeLog.create({
      data: {
        medicationId: req.params.id,
        changedById: req.userId!,
        changeType: 'STOPPED',
        previousValues: existing as any,
        newValues: updated as any,
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

/** PATCH /api/medications/:id/restart — mark active again */
router.patch('/:id/restart', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Not found or insufficient permission' }); return; }

    const updated = await prisma.medication.update({
      where: { id: req.params.id },
      data: { isActive: true },
    });

    await prisma.medicationChangeLog.create({
      data: {
        medicationId: req.params.id,
        changedById: req.userId!,
        changeType: 'RESTARTED',
        previousValues: existing as any,
        newValues: updated as any,
      },
    });

    res.json(updated);
  } catch (err) { next(err); }
});

/** DELETE /api/medications/:id */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Not found or insufficient permission' }); return; }
    await prisma.medication.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) { next(err); }
});

/** GET /api/medications/:id/history — change log */
router.get('/:id/history', async (req: AuthRequest, res, next) => {
  try {
    const med = await assertAccess(req.params.id, req.userId!);
    if (!med) { res.status(404).json({ error: 'Medication not found' }); return; }

    const logs = await prisma.medicationChangeLog.findMany({
      where: { medicationId: req.params.id },
      include: { changedBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(logs);
  } catch (err) { next(err); }
});

export default router;
