import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  console.error(`[${status}] ${message}`, err.stack);
  res.status(status).json({ error: message });
}
