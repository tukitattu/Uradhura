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

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.player = decoded;
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
