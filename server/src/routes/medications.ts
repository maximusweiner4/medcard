import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { stripHtml } from '../lib/sanitize';

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
      dose, form, route, frequency, instructions, prescriber, indication,
      pharmacy, pillColor, pillShape, pillImprint, pillImageUrl, bottlePhotoUrl,
      nextRefillDate, pillsRemaining,
    } = req.body;

    if (pillsRemaining !== undefined && pillsRemaining !== null && typeof pillsRemaining === 'number') {
      if (pillsRemaining < 0) { res.status(400).json({ error: 'pillsRemaining cannot be negative' }); return; }
      if (!Number.isInteger(pillsRemaining)) { res.status(400).json({ error: 'pillsRemaining must be a whole number' }); return; }
    }
    if (nextRefillDate !== undefined && nextRefillDate !== null) {
      const parsed = new Date(nextRefillDate);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid nextRefillDate format' }); return;
      }
    }

    // Run medication update + audit log in a single transaction
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.medication.update({
        where: { id: req.params.id },
        data: {
          ...(dose !== undefined && { dose: stripHtml(dose) }),
          ...(form !== undefined && { form: stripHtml(form) }),
          ...(route !== undefined && { route: stripHtml(route) }),
          ...(frequency !== undefined && { frequency: stripHtml(frequency) }),
          ...(instructions !== undefined && { instructions: stripHtml(instructions) }),
          ...(prescriber !== undefined && { prescriber: stripHtml(prescriber) }),
          ...(indication !== undefined && { indication: stripHtml(indication) }),
          ...(pharmacy !== undefined && { pharmacy: stripHtml(pharmacy) }),
          ...(pillColor !== undefined && { pillColor: typeof pillColor === 'string' ? stripHtml(pillColor).slice(0, 50) : pillColor }),
          ...(pillShape !== undefined && { pillShape: typeof pillShape === 'string' ? stripHtml(pillShape).slice(0, 50) : pillShape }),
          ...(pillImprint !== undefined && { pillImprint: typeof pillImprint === 'string' ? stripHtml(pillImprint).slice(0, 100) : pillImprint }),
          ...(pillImageUrl !== undefined && { pillImageUrl: typeof pillImageUrl === 'string' ? pillImageUrl.slice(0, 500) : pillImageUrl }),
          ...(bottlePhotoUrl !== undefined && { bottlePhotoUrl: typeof bottlePhotoUrl === 'string' ? bottlePhotoUrl.slice(0, 500) : bottlePhotoUrl }),
          ...(nextRefillDate !== undefined && { nextRefillDate: nextRefillDate ? new Date(nextRefillDate) : null }),
          ...(pillsRemaining !== undefined && { pillsRemaining: typeof pillsRemaining === 'number' ? pillsRemaining : null }),
        },
      });

      await tx.medicationChangeLog.create({
        data: {
          medicationId: req.params.id,
          changedById: req.userId!,
          changeType: 'UPDATED',
          previousValues: existing as any,
          newValues: result as any,
        },
      });

      return result;
    });

    res.json(updated);
  } catch (err) { next(err); }
});

/** PATCH /api/medications/:id/stop — mark inactive */
router.patch('/:id/stop', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Not found or insufficient permission' }); return; }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.medication.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });
      await tx.medicationChangeLog.create({
        data: {
          medicationId: req.params.id,
          changedById: req.userId!,
          changeType: 'STOPPED',
          previousValues: existing as any,
          newValues: result as any,
        },
      });
      return result;
    });

    res.json(updated);
  } catch (err) { next(err); }
});

/** PATCH /api/medications/:id/restart — mark active again */
router.patch('/:id/restart', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Not found or insufficient permission' }); return; }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.medication.update({
        where: { id: req.params.id },
        data: { isActive: true },
      });
      await tx.medicationChangeLog.create({
        data: {
          medicationId: req.params.id,
          changedById: req.userId!,
          changeType: 'RESTARTED',
          previousValues: existing as any,
          newValues: result as any,
        },
      });
      return result;
    });

    res.json(updated);
  } catch (err) { next(err); }
});

/** DELETE /api/medications/:id */
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const existing = await assertAccess(req.params.id, req.userId!, true);
    if (!existing) { res.status(404).json({ error: 'Not found or insufficient permission' }); return; }
    await prisma.$transaction([
      prisma.medicationChangeLog.create({
        data: {
          medicationId: existing.id,
          changedById: req.userId!,
          changeType: 'DELETED',
          previousValues: existing as any,
          newValues: {},
        },
      }),
      prisma.medication.delete({ where: { id: req.params.id } }),
    ]);
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
