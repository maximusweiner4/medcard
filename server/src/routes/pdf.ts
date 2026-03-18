import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

/** GET /api/patients/:id/pdf — generate medication list PDF
 *  Accepts JWT via Authorization header only */
router.get('/patients/:id/pdf', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const caregiver = await prisma.caregiverPatient.findFirst({
      where: { patientId: req.params.id, caregiverId: req.userId },
    });
    if (!caregiver) { res.status(403).json({ error: 'Access denied' }); return; }

    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        medications: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="medication-list.pdf"');
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Medication List', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text(patient.name, { align: 'center' });
    if (patient.dateOfBirth) {
      doc.fontSize(12).font('Helvetica').text('DOB: ' + new Date(patient.dateOfBirth).toLocaleDateString('en-US'), { align: 'center' });
    }
    doc.moveDown(0.5);

    // Allergies
    if (patient.allergies.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#dc2626').text('⚠ ALLERGIES: ' + patient.allergies.join(', '), { align: 'center' });
      doc.fillColor('#000000');
    } else {
      doc.fontSize(12).font('Helvetica').fillColor('#16a34a').text('No Known Drug Allergies', { align: 'center' });
      doc.fillColor('#000000');
    }

    doc.fontSize(10).font('Helvetica').fillColor('#64748b')
      .text('Generated: ' + new Date().toLocaleString('en-US'), { align: 'center' });
    doc.fillColor('#000000');
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);

    // Medications
    if (patient.medications.length === 0) {
      doc.fontSize(14).font('Helvetica').text('No active medications.', { align: 'center' });
    } else {
      for (const med of patient.medications) {
        doc.fontSize(14).font('Helvetica-Bold').text(med.drugName);
        if (med.brandName) {
          doc.fontSize(11).font('Helvetica').fillColor('#64748b').text(med.brandName);
          doc.fillColor('#000000');
        }

        const details: string[] = [];
        if (med.dose) details.push('Dose: ' + med.dose);
        if (med.form) details.push('Form: ' + med.form);
        if (med.route) details.push('Route: ' + med.route);
        if (details.length > 0) {
          doc.fontSize(11).font('Helvetica').text(details.join('  |  '));
        }

        if (med.frequency) {
          doc.fontSize(11).font('Helvetica').text('Frequency: ' + med.frequency);
        }
        if (med.indication) {
          doc.fontSize(11).font('Helvetica-Oblique').fillColor('#0d9488').text('Indication: ' + med.indication);
          doc.fillColor('#000000');
        }
        if (med.prescriber) {
          doc.fontSize(11).font('Helvetica').text('Prescriber: ' + med.prescriber);
        }
        if (med.pharmacy) {
          doc.fontSize(11).font('Helvetica').text('Pharmacy: ' + med.pharmacy);
        }
        if (med.instructions) {
          doc.fontSize(10).font('Helvetica').fillColor('#92400e').text('Instructions: ' + med.instructions);
          doc.fillColor('#000000');
        }

        doc.moveDown(0.8);
        doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor('#e2e8f0').stroke();
        doc.strokeColor('#000000');
        doc.moveDown(0.8);
      }
    }

    doc.end();
  } catch (err) { next(err); }
});

export default router;