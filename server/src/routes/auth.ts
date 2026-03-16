import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { stripHtml } from '../lib/sanitize';

const router = Router();

/** POST /api/auth/sync — called after Supabase login to ensure DB user record exists */
router.post('/sync', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/auth/profile — update name, phone */
router.patch('/profile', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { name, phone } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'name cannot be empty' }); return;
      }
      if (name.trim().length > 200) {
        res.status(400).json({ error: 'name must be 200 characters or fewer' }); return;
      }
    }
    if (phone !== undefined && typeof phone === 'string' && phone.length > 30) {
      res.status(400).json({ error: 'phone must be 30 characters or fewer' }); return;
    }
    const cleanName = name ? stripHtml(name.trim()) : undefined;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(cleanName && { name: cleanName }), ...(phone && { phone: stripHtml(phone.trim()) }) },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
