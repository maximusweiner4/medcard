import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { checkAndSendRefillReminders } from '../services/notifications.service';

const router = Router();

/** POST /api/notifications/token — save Expo push token for the current user */
router.post('/token', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'token is required' }); return;
    }
    await prisma.user.update({
      where: { id: req.userId },
      data: { pushToken: token },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/** POST /api/notifications/check-refills — trigger refill reminder check
 *  Protected by a secret key header — call from Railway cron or external scheduler */
router.post('/check-refills', async (req, res, next) => {
  try {
    const secret = req.headers['x-cron-secret'];
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      res.status(401).json({ error: 'Unauthorized' }); return;
    }
    const count = await checkAndSendRefillReminders();
    res.json({ ok: true, medicationsChecked: count });
  } catch (err) { next(err); }
});

export default router;
