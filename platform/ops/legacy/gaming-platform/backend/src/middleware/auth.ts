import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';

export interface JwtPayload {
  playerId: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      player?: JwtPayload;
      requestId?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const prisma = (await import('../config/database')).default;
    const player = await prisma.player.findUnique({
      where: { id: decoded.playerId },
      select: { id: true, username: true, role: true, isActive: true },
    });
    if (!player || !player.isActive) {
      sendError(res, 'Account is inactive or unavailable', 'ACCOUNT_INACTIVE', 401);
      return;
    }
    req.player = { playerId: player.id, username: player.username, role: player.role };
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 'TOKEN_INVALID', 401);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.player) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }
  if (req.player.role !== 'admin' && req.player.role !== 'super_admin') {
    sendError(res, 'Admin access required', 'FORBIDDEN', 403);
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.player || req.player.role !== 'super_admin') {
    sendError(res, 'Super admin access required', 'FORBIDDEN', 403);
    return;
  }
  next();
}

export function attachRequestId(req: Request, _res: Response, next: NextFunction): void {
  const { v4: uuidv4 } = require('uuid');
  req.requestId = uuidv4();
  next();
}
