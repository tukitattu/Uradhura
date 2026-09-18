import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../services/audit.service';

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    sendError(res, 'Username, email, and password are required', 'VALIDATION_ERROR');
    return;
  }

  const existing = await prisma.player.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    sendError(res, 'Username or email already exists', 'DUPLICATE_USER', 409);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const playerId = uuidv4();

  const player = await prisma.$transaction(async (tx) => {
    const p = await tx.player.create({
      data: { id: playerId, username, email, passwordHash },
    });
    await tx.walletAccount.create({
      data: { id: uuidv4(), playerId, balance: 1000 }, // 1000 demo tokens
    });
    return p;
  });

  await createAuditLog({
    actorId: player.id,
    actorType: 'player',
    action: 'PLAYER_REGISTERED',
    entityType: 'player',
    entityId: player.id,
    ipAddress: req.ip,
  });

  const token = jwt.sign(
    { playerId: player.id, username: player.username, role: player.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );

  sendSuccess(res, { token, player: { id: player.id, username, email, role: player.role } }, 'Registration successful', 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    sendError(res, 'Email and password are required', 'VALIDATION_ERROR');
    return;
  }

  const player = await prisma.player.findUnique({ where: { email } });
  if (!player || !player.isActive) {
    sendError(res, 'Invalid credentials', 'AUTH_FAILED', 401);
    return;
  }

  const valid = await bcrypt.compare(password, player.passwordHash);
  if (!valid) {
    sendError(res, 'Invalid credentials', 'AUTH_FAILED', 401);
    return;
  }

  const wallet = await prisma.walletAccount.findUnique({ where: { playerId: player.id } });

  const token = jwt.sign(
    { playerId: player.id, username: player.username, role: player.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '24h' }
  );

  await createAuditLog({
    actorId: player.id,
    actorType: player.role,
    action: 'LOGIN',
    entityType: 'player',
    entityId: player.id,
    ipAddress: req.ip,
  });

  sendSuccess(res, {
    token,
    player: {
      id: player.id,
      username: player.username,
      email: player.email,
      role: player.role,
      balance: wallet?.balance ?? 0,
    },
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const player = await prisma.player.findUnique({
    where: { id: req.player!.playerId },
    include: { walletAccount: true },
  });
  if (!player) {
    sendError(res, 'Player not found', 'NOT_FOUND', 404);
    return;
  }
  sendSuccess(res, {
    id: player.id,
    username: player.username,
    email: player.email,
    role: player.role,
    balance: player.walletAccount?.balance ?? 0,
  });
}
