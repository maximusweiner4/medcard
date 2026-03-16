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

  // Look up user record — only create if not found (avoids noisy upsert write on every request)
  let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) {
    try {
      dbUser = await prisma.user.create({
        data: {
          supabaseId: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        // Concurrent first-login — another request already created the record
        dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
      } else {
        throw e;
      }
    }
  }
  if (!dbUser) {
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }

  req.userId = dbUser.id;
  req.supabaseId = user.id;
  next();
}
