import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { createShareLink } from '../services/share.service';
import { stripHtml } from '../lib/sanitize';

const router = Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' }); return;
    }
    const cleanPatientName = stripHtml(name.trim());
    if (!cleanPatientName) {
      res.status(400).json({ error: 'name is required' }); return;
    }
    if (cleanPatientName.length > 200) {
      res.status(400).json({ error: 'name must be 200 characters or fewer' }); return;
    }
    if (Array.isArray(allergies)) {
      if (allergies.length > 30) {
        res.status(400).json({ error: 'Too many allergies (max 30)' }); return;
      }
      for (const a of allergies) {
        if (typeof a !== 'string') {
          res.status(400).json({ error: 'Each allergy must be a text value' }); return;
        }
        if (a.length > 100) {
          res.status(400).json({ error: 'Each allergy must be 100 characters or fewer' }); return;
        }
      }
    }

    // Validate dateOfBirth if provided
    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid dateOfBirth format' }); return;
      }
      if (parsed > new Date()) {
        res.status(400).json({ error: 'dateOfBirth cannot be in the future' }); return;
      }
    }

    // Use transaction to ensure patient + caregiver link are created atomically
    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          name: cleanPatientName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          allergies: Array.isArray(allergies) ? allergies.map(stripHtml).filter(Boolean) : [],
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
    if (!UUID_REGEX.test(req.params.id)) { res.status(400).json({ error: 'Invalid ID format' }); return; }
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
    if (!UUID_REGEX.test(req.params.id)) { res.status(400).json({ error: 'Invalid ID format' }); return; }
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!caregiver) { res.status(403).json({ error: 'Admin permission required' }); return; }

    const { name, dateOfBirth, allergies } = req.body;
    let cleanPatchName: string | undefined;

    if (name !== undefined) {
      if (typeof name !== 'string') {
        res.status(400).json({ error: 'name cannot be empty' }); return;
      }
      cleanPatchName = stripHtml(name).trim();
      if (!cleanPatchName) {
        res.status(400).json({ error: 'name cannot be empty' }); return;
      }
      if (cleanPatchName.length > 200) {
        res.status(400).json({ error: 'name must be 200 characters or fewer' }); return;
      }
    }

    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid dateOfBirth format' }); return;
      }
      if (parsed > new Date()) {
        res.status(400).json({ error: 'dateOfBirth cannot be in the future' }); return;
      }
    }

    if (Array.isArray(allergies)) {
      if (allergies.length > 30) {
        res.status(400).json({ error: 'Too many allergies (max 30)' }); return;
      }
      for (const a of allergies) {
        if (typeof a !== 'string') {
          res.status(400).json({ error: 'Each allergy must be a text value' }); return;
        }
        if (a.length > 100) {
          res.status(400).json({ error: 'Each allergy must be 100 characters or fewer' }); return;
        }
      }
    }

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        ...(cleanPatchName !== undefined && { name: cleanPatchName }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(allergies !== undefined && { allergies: Array.isArray(allergies) ? allergies.map(stripHtml).filter(Boolean) : [] }),
      },
    });
    res.json(patient);
  } catch (err) { next(err); }
});

/** POST /api/patients/:id/share — generate share link + QR code */
router.post('/:id/share', async (req: AuthRequest, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) { res.status(400).json({ error: 'Invalid ID format' }); return; }
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
      expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    res.json(result);
  } catch (err) { next(err); }
});

/** GET /api/patients/:id/medications — all medications for a patient */
router.get('/:id/medications', async (req: AuthRequest, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) { res.status(400).json({ error: 'Invalid ID format' }); return; }
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
    if (!UUID_REGEX.test(req.params.id)) { res.status(400).json({ error: 'Invalid ID format' }); return; }
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
    const cleanDrugName = stripHtml(drugName.trim());
    if (!cleanDrugName) {
      res.status(400).json({ error: 'drugName is required' }); return;
    }
    const medTextFields = ['brandName', 'dose', 'form', 'route', 'frequency', 'instructions', 'prescriber', 'indication', 'pharmacy'] as const;
    for (const field of medTextFields) {
      if (req.body[field] !== undefined && req.body[field] !== null && typeof req.body[field] !== 'string') {
        res.status(400).json({ error: `${field} must be a string` }); return;
      }
    }
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

    const medication = await prisma.$transaction(async (tx) => {
      const created = await tx.medication.create({
        data: {
          patientId: req.params.id,
          rxcui, ndc,
          drugName: cleanDrugName,
          brandName: brandName ? stripHtml(brandName) : undefined,
          dose: dose ? stripHtml(dose) : undefined,
          form: form ? stripHtml(form) : undefined,
          route: route ? stripHtml(route) : undefined,
          frequency: frequency ? stripHtml(frequency) : undefined,
          instructions: instructions ? stripHtml(instructions) : undefined,
          prescriber: prescriber ? stripHtml(prescriber) : undefined,
          indication: indication ? stripHtml(indication) : undefined,
          pharmacy: pharmacy ? stripHtml(pharmacy) : undefined,
          pillColor: pillColor ? stripHtml(String(pillColor)).slice(0, 50) : undefined,
          pillShape: pillShape ? stripHtml(String(pillShape)).slice(0, 50) : undefined,
          pillImprint: pillImprint ? stripHtml(String(pillImprint)).slice(0, 100) : undefined,
          pillImageUrl: pillImageUrl ? String(pillImageUrl).slice(0, 500) : undefined,
          bottlePhotoUrl: bottlePhotoUrl ? String(bottlePhotoUrl).slice(0, 500) : undefined,
          ...(nextRefillDate && { nextRefillDate: new Date(nextRefillDate) }),
          ...(pillsRemaining !== undefined && typeof pillsRemaining === 'number' && { pillsRemaining }),
          addedById: req.userId,
        },
      });
      await tx.medicationChangeLog.create({
        data: {
          medicationId: created.id,
          changedById: req.userId!,
          changeType: 'ADDED',
          newValues: created as any,
        },
      });
      return created;
    });

    res.status(201).json(medication);
  } catch (err) { next(err); }
});

/** POST /api/patients/:id/caregivers — invite a caregiver */
router.post('/:id/caregivers', async (req: AuthRequest, res, next) => {
  try {
    if (!UUID_REGEX.test(req.params.id)) { res.status(400).json({ error: 'Invalid ID format' }); return; }
    const isAdmin = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId, permissionLevel: 'ADMIN' },
    });
    if (!isAdmin) { res.status(403).json({ error: 'Admin permission required' }); return; }

    const { email, permissionLevel, relationship } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'email is required' }); return;
    }
    const validLevels = ['ADMIN', 'VIEW_ONLY'];
    if (permissionLevel && !validLevels.includes(permissionLevel)) {
      res.status(400).json({ error: 'permissionLevel must be ADMIN or VIEW_ONLY' }); return;
    }
    if (relationship !== undefined && relationship !== null) {
      if (typeof relationship !== 'string') {
        res.status(400).json({ error: 'relationship must be a string' }); return;
      }
      if (relationship.length > 100) {
        res.status(400).json({ error: 'relationship must be 100 characters or fewer' }); return;
      }
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254) {
      res.status(400).json({ error: 'email must be 254 characters or fewer' }); return;
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ error: 'Invalid email format' }); return;
    }

    const invitedUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!invitedUser) { res.status(404).json({ error: 'No account found for that email. Ask them to sign up first.' }); return; }

    const cleanRelationship = relationship ? stripHtml(relationship.trim()) : undefined;
    const relation = await prisma.caregiverPatient.upsert({
      where: { caregiverId_patientId: { caregiverId: invitedUser.id, patientId: req.params.id } },
      update: { permissionLevel: permissionLevel || 'VIEW_ONLY', relationship: cleanRelationship },
      create: {
        caregiverId: invitedUser.id,
        patientId: req.params.id,
        permissionLevel: permissionLevel || 'VIEW_ONLY',
        relationship: cleanRelationship,
      },
    });
    res.status(201).json(relation);
  } catch (err) { next(err); }
});

export default router;
