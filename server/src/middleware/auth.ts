import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthRequest extends Request {
  userId?: string;
  supabaseId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Ensure user record exists in our DB
  const dbUser = await prisma.user.upsert({
    where: { supabaseId: user.id },
    update: { email: user.email || '' },
    create: {
      supabaseId: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    },
  });

  req.userId = dbUser.id;
  req.supabaseId = user.id;
  next();
}
