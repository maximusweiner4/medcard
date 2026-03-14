import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createShareLink } from '../services/share.service';

const router = Router();
router.use(requireAuth);

const patientInclude = {
  medications: {
    where: { isActive: true },
    orderBy: { createdAt: 'asc' as const },
  },
  caregivers: {
    include: { caregiver: { select: { id: true, name: true, email: true } } },
  },
};

/** GET /api/patients — list patients this caregiver manages */
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const relations = await prisma.caregiverPatient.findMany({
      where: { caregiverId: req.userId },
      include: { patient: { include: patientInclude } },
    });
    const patients = relations.map((r) => r.patient);
    res.json(patients);
  } catch (err) { next(err); }
});

/** POST /api/patients — create patient profile */
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name, dateOfBirth, allergies } = req.body;
    if (!name) { res.status(400).json({ error: 'name is required' }); return; }

    const patient = await prisma.patient.create({
      data: {
        name,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        allergies: allergies || [],
        primaryCaregiverId: req.userId!,
      },
    });

    // Auto-add as ADMIN caregiver
    await prisma.caregiverPatient.create({
      data: { caregiverId: req.userId!, patientId: patient.id, permissionLevel: 'ADMIN' },
    });

    res.status(201).json(patient);
  } catch (err) { next(err); }
});

/** GET /api/patients/:id */
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: {
        id: req.params.id,
        caregivers: { some: { caregiverId: req.userId } },
      },
      include: patientInclude,
    });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }
    res.json(patient);
  } catch (err) { next(err); }
});

/** PATCH /api/patients/:id */
router.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!caregiver) { res.status(403).json({ error: 'Admin permission required' }); return; }

    const { name, dateOfBirth, allergies } = req.body;
    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(allergies !== undefined && { allergies }),
      },
    });
    res.json(patient);
  } catch (err) { next(err); }
});

/** POST /api/patients/:id/share — generate share link + QR code */
router.post('/:id/share', async (req: AuthRequest, res, next) => {
  try {
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId },
    });
    if (!caregiver) { res.status(403).json({ error: 'Access denied' }); return; }

    const { expiresAt } = req.body;
    const result = await createShareLink(
      req.params.id,
      req.userId!,
      expiresAt ? new Date(expiresAt) : undefined
    );
    res.json(result);
  } catch (err) { next(err); }
});

/** GET /api/patients/:id/medications — all medications for a patient */
router.get('/:id/medications', async (req: AuthRequest, res, next) => {
  try {
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId },
    });
    if (!caregiver) { res.status(403).json({ error: 'Access denied' }); return; }

    const showStopped = req.query.showStopped === 'true';
    const medications = await prisma.medication.findMany({
      where: { patientId: req.params.id, ...(showStopped ? {} : { isActive: true }) },
      orderBy: { createdAt: 'asc' },
    });
    res.json(medications);
  } catch (err) { next(err); }
});

/** POST /api/patients/:id/medications — add a medication */
router.post('/:id/medications', async (req: AuthRequest, res, next) => {
  try {
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!caregiver) { res.status(403).json({ error: 'Admin permission required' }); return; }

    const {
      rxcui, drugName, brandName, dose, form, route, frequency,
      instructions, prescriber, pharmacy, pillColor, pillShape,
      pillImprint, pillImageUrl, bottlePhotoUrl, ndc,
    } = req.body;
    if (!drugName) { res.status(400).json({ error: 'drugName is required' }); return; }

    const medication = await prisma.medication.create({
      data: {
        patientId: req.params.id,
        rxcui, drugName, brandName, dose, form, route, frequency,
        instructions, prescriber, pharmacy, pillColor, pillShape,
        pillImprint, pillImageUrl, bottlePhotoUrl, ndc,
        addedById: req.userId,
      },
    });

    // Log change
    await prisma.medicationChangeLog.create({
      data: {
        medicationId: medication.id,
        changedById: req.userId!,
        changeType: 'ADDED',
        newValues: medication as any,
      },
    });

    res.status(201).json(medication);
  } catch (err) { next(err); }
});

/** POST /api/patients/:id/caregivers — invite a caregiver */
router.post('/:id/caregivers', async (req: AuthRequest, res, next) => {
  try {
    const isAdmin = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!isAdmin) { res.status(403).json({ error: 'Admin permission required' }); return; }

    const { email, permissionLevel, relationship } = req.body;
    if (!email) { res.status(400).json({ error: 'email is required' }); return; }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) { res.status(404).json({ error: 'No account found for that email. Ask them to sign up first.' }); return; }

    const relation = await prisma.caregiverPatient.upsert({
      where: { caregiverId_patientId: { caregiverId: invitedUser.id, patientId: req.params.id } },
      update: { permissionLevel: permissionLevel || 'VIEW_ONLY', relationship },
      create: {
        caregiverId: invitedUser.id,
        patientId: req.params.id,
        permissionLevel: permissionLevel || 'VIEW_ONLY',
        relationship,
      },
    });
    res.status(201).json(relation);
  } catch (err) { next(err); }
});

export default router;
