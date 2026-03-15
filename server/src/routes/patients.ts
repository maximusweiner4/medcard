import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createShareLink } from '../services/share.service';
import { stripHtml } from '../lib/sanitize';

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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 50);
    const skip = (page - 1) * limit;

    const relations = await prisma.caregiverPatient.findMany({
      where: { caregiverId: req.userId },
      include: { patient: { include: patientInclude } },
      skip,
      take: limit,
    });
    const patients = relations.map((r) => r.patient);
    res.json(patients);
  } catch (err) { next(err); }
});

/** POST /api/patients — create patient profile */
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { name, dateOfBirth, allergies } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name is required' }); return;
    }

    // Validate dateOfBirth if provided
    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid dateOfBirth format' }); return;
      }
    }

    // Use transaction to ensure patient + caregiver link are created atomically
    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          name: stripHtml(name.trim()),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          allergies: Array.isArray(allergies) ? allergies.map(stripHtml) : [],
          primaryCaregiverId: req.userId!,
        },
      });

      // Auto-add as ADMIN caregiver — inside the same transaction
      await tx.caregiverPatient.create({
        data: { caregiverId: req.userId!, patientId: created.id, permissionLevel: 'ADMIN' },
      });

      return created;
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

    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid dateOfBirth format' }); return;
      }
    }

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: stripHtml(name) }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(allergies !== undefined && { allergies: Array.isArray(allergies) ? allergies.map(stripHtml) : [] }),
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
    if (expiresAt !== undefined) {
      const parsed = new Date(expiresAt);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid expiresAt format' }); return;
      }
    }

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
      instructions, prescriber, indication, pharmacy, pillColor, pillShape,
      pillImprint, pillImageUrl, bottlePhotoUrl, ndc, nextRefillDate, pillsRemaining,
    } = req.body;
    if (!drugName || typeof drugName !== 'string' || !drugName.trim()) {
      res.status(400).json({ error: 'drugName is required' }); return;
    }

    const medication = await prisma.medication.create({
      data: {
        patientId: req.params.id,
        rxcui, ndc,
        drugName: stripHtml(drugName),
        brandName: brandName ? stripHtml(brandName) : undefined,
        dose: dose ? stripHtml(dose) : undefined,
        form: form ? stripHtml(form) : undefined,
        route: route ? stripHtml(route) : undefined,
        frequency: frequency ? stripHtml(frequency) : undefined,
        instructions: instructions ? stripHtml(instructions) : undefined,
        prescriber: prescriber ? stripHtml(prescriber) : undefined,
        indication: indication ? stripHtml(indication) : undefined,
        pharmacy: pharmacy ? stripHtml(pharmacy) : undefined,
        pillColor, pillShape, pillImprint, pillImageUrl, bottlePhotoUrl,
        ...(nextRefillDate && { nextRefillDate: new Date(nextRefillDate) }),
        ...(pillsRemaining !== undefined && typeof pillsRemaining === 'number' && { pillsRemaining }),
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
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'email is required' }); return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email format' }); return;
    }

    const invitedUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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

/** GET /api/patients/:id/interactions — check drug interactions via RxNorm */
router.get('/:id/interactions', async (req: AuthRequest, res, next) => {
  try {
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId },
    });
    if (!caregiver) { res.status(403).json({ error: 'Access denied' }); return; }

    const meds = await prisma.medication.findMany({
      where: { patientId: req.params.id, isActive: true },
      select: { rxcui: true, drugName: true },
    });
    const rxcuis = meds.filter((m) => m.rxcui).map((m) => m.rxcui as string);

    if (rxcuis.length < 2) {
      res.json({ interactions: [], message: 'Not enough medications with drug codes to check.' });
      return;
    }

    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`;
    const response = await fetch(url);
    const rxData = await response.json() as any;

    const interactions: { drug1: string; drug2: string; severity: string; description: string }[] = [];
    const groups = rxData?.fullInteractionTypeGroup ?? [];
    for (const group of groups) {
      for (const type of (group.fullInteractionType ?? [])) {
        const names = type.minConcept?.map((c: any) => c.name) ?? [];
        for (const pair of (type.interactionPair ?? [])) {
          interactions.push({
            drug1: names[0] ?? 'Unknown',
            drug2: names[1] ?? 'Unknown',
            severity: pair.severity ?? 'unknown',
            description: pair.description ?? '',
          });
        }
      }
    }

    res.json({ interactions, checkedAt: new Date().toISOString() });
  } catch (err) { next(err); }
});

export default router;
