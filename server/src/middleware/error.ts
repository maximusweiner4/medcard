import { Request, Response, NextFunction } from 'express';

/** Sanitize error messages to avoid leaking Prisma/ORM internals to clients. */
function safeMessage(err: any): string {
  const raw: string = err.message || '';

  // Prisma error codes — return generic messages
  if (err.code === 'P2002') return 'A record with that value already exists.';
  if (err.code === 'P2025') return 'Record not found.';
  if (err.code?.startsWith('P')) return 'Database error.';

  // Don't leak internal stack traces or query text
  if (raw.includes('prisma') || raw.includes('query') || raw.includes('column')) {
    return 'Internal server error.';
  }

  return raw || 'Internal server error';
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = typeof err.status === 'number' ? err.status
    : typeof err.statusCode === 'number' ? err.statusCode
    : 500;

  const message = safeMessage(err);
  console.error(`[${status}] ${err.message || message}`, err.stack);
  res.status(status).json({ error: message });
}
