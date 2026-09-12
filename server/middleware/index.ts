import { Request, Response, NextFunction } from 'express';
import { getPool } from '../database/index.js';

// Auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
}

// Admin middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.session.userRole !== 'ADMIN' && req.session.userRole !== 'MODERATOR') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

// Validation middleware factory
export function validate(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    req.body = result.data;
    next();
  };
}

// Error handler
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Audit log helper
export async function logAdminAction(adminId: string, action: string, targetType?: string, targetId?: string, metadata?: any, ip?: string) {
  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO admin_logs (id, admin_id, action, target_type, target_id, metadata, ip_address) VALUES (UUID(), ?, ?, ?, ?, ?, ?)',
      [adminId, action, targetType, targetId, metadata ? JSON.stringify(metadata) : null, ip]
    );
  } catch (error) {
    // Audit logging must never make the actual admin operation fail.
    console.warn('[ADMIN LOG] Could not write audit log:', error instanceof Error ? error.message : error);
  }
}
