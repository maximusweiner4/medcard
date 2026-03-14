import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

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
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(name && { name }), ...(phone && { phone }) },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
