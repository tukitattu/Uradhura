import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../services/audit.service';
import { v4 as uuidv4 } from 'uuid';

// ─── Design Tokens ────────────────────────────────────────────────────────────

export async function getDesignTokens(req: Request, res: Response): Promise<void> {
  const { scope } = req.query;
  const tokens = await prisma.designToken.findMany({
    where: scope ? { scope: String(scope) } : {},
    orderBy: [{ scope: 'asc' }, { key: 'asc' }],
  });
  sendSuccess(res, tokens);
}

export async function upsertDesignToken(req: Request, res: Response): Promise<void> {
  const { scope, key, value, label } = req.body;
  if (!scope || !key || value === undefined) {
    sendError(res, 'scope, key and value are required', 'VALIDATION_ERROR');
    return;
  }
  const token = await prisma.designToken.upsert({
    where: { scope_key: { scope, key } },
    update: { value, label, updatedBy: req.player?.playerId },
    create: { id: uuidv4(), scope, key, value, label, updatedBy: req.player?.playerId },
  });
  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'DESIGN_TOKEN_UPDATED', entityType: 'design_token', entityId: token.id,
    after: { scope, key, value },
  });
  sendSuccess(res, token, 'Token saved');
}

export async function bulkUpsertTokens(req: Request, res: Response): Promise<void> {
  const { tokens } = req.body;
  if (!Array.isArray(tokens) || tokens.length === 0) {
    sendError(res, 'tokens array is required', 'VALIDATION_ERROR');
    return;
  }
  const results = [];
  for (const t of tokens) {
    const r = await prisma.designToken.upsert({
      where: { scope_key: { scope: t.scope, key: t.key } },
      update: { value: t.value, label: t.label, updatedBy: req.player?.playerId },
      create: { id: uuidv4(), scope: t.scope, key: t.key, value: t.value, label: t.label, updatedBy: req.player?.playerId },
    });
    results.push(r);
  }
  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'DESIGN_TOKENS_BULK_UPDATE', entityType: 'design_token',
    after: { count: results.length },
  });
  sendSuccess(res, results, `${results.length} tokens saved`);
}

export async function deleteDesignToken(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.designToken.delete({ where: { id } });
  sendSuccess(res, null, 'Token deleted');
}

// ─── Game Branding ────────────────────────────────────────────────────────────

export async function getGameBrandings(req: Request, res: Response): Promise<void> {
  const brandings = await prisma.gameBranding.findMany({ orderBy: { gameSlug: 'asc' } });
  const games = await prisma.game.findMany({ orderBy: { sortOrder: 'asc' } });
  const merged = games.map(g => ({
    ...g,
    branding: brandings.find(b => b.gameSlug === g.slug) || null,
  }));
  sendSuccess(res, merged);
}

export async function upsertGameBranding(req: Request, res: Response): Promise<void> {
  const { gameSlug } = req.params;
  const { displayName, logoUrl, iconEmoji, primaryColor, accentColor, bgGradient, tagline, isVisible } = req.body;

  const game = await prisma.game.findUnique({ where: { slug: gameSlug } });
  if (!game) { sendError(res, 'Game not found', 'NOT_FOUND', 404); return; }

  const branding = await prisma.gameBranding.upsert({
    where: { gameSlug },
    update: { displayName, logoUrl, iconEmoji, primaryColor, accentColor, bgGradient, tagline, isVisible, updatedBy: req.player?.playerId },
    create: { gameSlug, displayName, logoUrl, iconEmoji, primaryColor, accentColor, bgGradient, tagline, isVisible: isVisible ?? true, updatedBy: req.player?.playerId },
  });

  if (displayName) {
    await prisma.game.update({ where: { slug: gameSlug }, data: { name: displayName } });
  }

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'GAME_BRANDING_UPDATED', entityType: 'game_branding', entityId: branding.id,
    after: req.body,
  });

  sendSuccess(res, branding, 'Game branding updated');
}

// ─── Feature Flags ────────────────────────────────────────────────────────────

export async function getFeatureFlags(req: Request, res: Response): Promise<void> {
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  sendSuccess(res, flags);
}

export async function upsertFeatureFlag(req: Request, res: Response): Promise<void> {
  const { key, label, description, enabled, allowedRoles } = req.body;
  if (!key || !label) { sendError(res, 'key and label required', 'VALIDATION_ERROR'); return; }

  const flag = await prisma.featureFlag.upsert({
    where: { key },
    update: { label, description, enabled, allowedRoles, updatedBy: req.player?.playerId },
    create: { key, label, description, enabled: enabled ?? true, allowedRoles: allowedRoles || 'player,admin,super_admin', updatedBy: req.player?.playerId },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'FEATURE_FLAG_UPDATED', entityType: 'feature_flag', entityId: flag.id,
    after: { key, enabled, allowedRoles },
  });

  sendSuccess(res, flag, 'Feature flag updated');
}

export async function deleteFeatureFlag(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  await prisma.featureFlag.delete({ where: { id } });
  sendSuccess(res, null, 'Flag deleted');
}

// ─── Platform Stats ───────────────────────────────────────────────────────────

export async function getPlatformStats(req: Request, res: Response): Promise<void> {
  const [players, games, rounds, bets, tokens] = await Promise.all([
    prisma.player.count(),
    prisma.game.count(),
    prisma.gameRound.count(),
    prisma.gameBet.count(),
    prisma.designToken.count(),
  ]);
  const activePlayers = await prisma.player.count({ where: { isActive: true } });
  sendSuccess(res, { players, activePlayers, games, rounds, bets, designTokens: tokens, version: '1.0.0', db: 'SQLite' });
}

// ─── Account Management ───────────────────────────────────────────────────────

/** List all admin + super_admin accounts (used in account management tab) */
export async function listAdminAccounts(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;
  const roleFilter = req.query.role as string | undefined;

  const where = roleFilter
    ? { role: roleFilter }
    : { role: { in: ['admin', 'super_admin', 'player'] } };

  const [accounts, total] = await Promise.all([
    prisma.player.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { walletAccount: { select: { balance: true } }, videoCallAccess: true },
    }),
    prisma.player.count({ where }),
  ]);

  const sanitized = accounts.map(a => ({
    id: a.id,
    username: a.username,
    email: a.email,
    role: a.role,
    isActive: a.isActive,
    createdAt: a.createdAt,
    balance: a.walletAccount?.balance ?? 0,
    hasVideoAccess: !!a.videoCallAccess?.isActive,
  }));

  sendSuccess(res, { accounts: sanitized, total, page, limit });
}

/** Create a new account directly (no self-registration) */
export async function createAccount(req: Request, res: Response): Promise<void> {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    sendError(res, 'username, email, and password are required', 'VALIDATION_ERROR');
    return;
  }
  const validRoles = ['player', 'admin', 'super_admin'];
  const assignedRole = validRoles.includes(role) ? role : 'player';

  const existing = await prisma.player.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    sendError(res, 'Username or email already in use', 'DUPLICATE', 409);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const player = await prisma.player.create({
    data: { id: uuidv4(), username, email, passwordHash, role: assignedRole },
  });
  await prisma.walletAccount.create({
    data: { id: uuidv4(), playerId: player.id, balance: 0 },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'ACCOUNT_CREATED', entityType: 'player', entityId: player.id,
    after: { username, email, role: assignedRole },
  });

  sendSuccess(res, {
    id: player.id, username: player.username, email: player.email,
    role: player.role, isActive: player.isActive, createdAt: player.createdAt,
  }, 'Account created', 201);
}

/** Change role for any player (promote to admin / super_admin, or demote) */
export async function setPlayerRole(req: Request, res: Response): Promise<void> {
  const { playerId } = req.params;
  const { role } = req.body;

  const validRoles = ['player', 'admin', 'super_admin'];
  if (!validRoles.includes(role)) {
    sendError(res, `role must be one of: ${validRoles.join(', ')}`, 'VALIDATION_ERROR');
    return;
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) { sendError(res, 'Player not found', 'NOT_FOUND', 404); return; }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { role },
  });

  // If there was a pending admin request, mark it approved
  await prisma.adminAuthorizationRequest.updateMany({
    where: { playerId, status: 'pending' },
    data: { status: 'approved', reviewedBy: req.player?.playerId, reviewedAt: new Date() },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'PLAYER_ROLE_CHANGED', entityType: 'player', entityId: playerId,
    before: { role: player.role }, after: { role },
  });

  sendSuccess(res, { id: updated.id, role: updated.role }, 'Role updated');
}

/** Ban or unban an account */
export async function setPlayerStatus(req: Request, res: Response): Promise<void> {
  const { playerId } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    sendError(res, 'isActive (boolean) is required', 'VALIDATION_ERROR');
    return;
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) { sendError(res, 'Player not found', 'NOT_FOUND', 404); return; }

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { isActive },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: isActive ? 'ACCOUNT_UNBANNED' : 'ACCOUNT_BANNED',
    entityType: 'player', entityId: playerId,
    before: { isActive: player.isActive }, after: { isActive },
  });

  sendSuccess(res, { id: updated.id, isActive: updated.isActive }, isActive ? 'Account unbanned' : 'Account banned');
}

/** Fix: approve admin request AND actually write the role */
export async function approveAdminRequest(req: Request, res: Response): Promise<void> {
  const { requestId } = req.params;
  const { notes } = req.body;

  const request = await prisma.adminAuthorizationRequest.findUnique({
    where: { id: requestId },
    include: { player: true },
  });
  if (!request) { sendError(res, 'Request not found', 'NOT_FOUND', 404); return; }
  if (request.status !== 'pending') {
    sendError(res, 'Request is not pending', 'INVALID_STATE', 409);
    return;
  }

  await prisma.$transaction([
    // Mark request approved
    prisma.adminAuthorizationRequest.update({
      where: { id: requestId },
      data: { status: 'approved', reviewedBy: req.player?.playerId, reviewedAt: new Date(), notes: notes || undefined },
    }),
    // ACTUALLY update the player's role (the previous implementation forgot this)
    prisma.player.update({
      where: { id: request.playerId },
      data: { role: request.requestedRole },
    }),
  ]);

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'ADMIN_REQUEST_APPROVED', entityType: 'player', entityId: request.playerId,
    before: { role: request.player.role }, after: { role: request.requestedRole },
  });

  sendSuccess(res, { requestId, role: request.requestedRole }, 'Admin request approved and role assigned');
}

/** Reject admin request */
export async function rejectAdminRequest(req: Request, res: Response): Promise<void> {
  const { requestId } = req.params;
  const { notes } = req.body;

  const request = await prisma.adminAuthorizationRequest.findUnique({ where: { id: requestId } });
  if (!request) { sendError(res, 'Request not found', 'NOT_FOUND', 404); return; }

  await prisma.adminAuthorizationRequest.update({
    where: { id: requestId },
    data: { status: 'rejected', reviewedBy: req.player?.playerId, reviewedAt: new Date(), notes: notes || undefined },
  });

  sendSuccess(res, { requestId }, 'Admin request rejected');
}

/** List all admin authorization requests */
export async function listAdminRequests(req: Request, res: Response): Promise<void> {
  const status = req.query.status as string | undefined;
  const requests = await prisma.adminAuthorizationRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: { player: { select: { id: true, username: true, email: true, role: true } } },
  });
  sendSuccess(res, requests);
}

// ─── Game CRUD (superadmin level) ─────────────────────────────────────────────

/** Create a new game */
export async function createGame(req: Request, res: Response): Promise<void> {
  const { name, slug, description, sortOrder } = req.body;
  if (!name || !slug) { sendError(res, 'name and slug are required', 'VALIDATION_ERROR'); return; }

  const slugNorm = slug.toLowerCase().replace(/\s+/g, '-');
  const existing = await prisma.game.findUnique({ where: { slug: slugNorm } });
  if (existing) { sendError(res, 'A game with this slug already exists', 'DUPLICATE', 409); return; }

  const game = await prisma.game.create({
    data: { id: uuidv4(), name, slug: slugNorm, description: description || null, sortOrder: sortOrder ?? 99, isActive: false },
  });
  await prisma.gameConfiguration.create({
    data: { id: uuidv4(), gameId: game.id, houseEdge: 8.0, maxPayoutPerRound: 10000, jackpotWeight: 1.0, maxDailyLoss: 100000 },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'GAME_CREATED', entityType: 'game', entityId: game.id,
    after: { name, slug: slugNorm },
  });

  sendSuccess(res, game, 'Game created', 201);
}

/** Soft-delete (deactivate) a game */
export async function deleteGame(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) { sendError(res, 'Game not found', 'NOT_FOUND', 404); return; }

  await prisma.game.update({ where: { id: gameId }, data: { isActive: false } });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'GAME_DELETED', entityType: 'game', entityId: gameId,
    before: { name: game.name, isActive: game.isActive },
  });

  sendSuccess(res, null, 'Game deactivated');
}

/** Update sort order for a game */
export async function updateGameSortOrder(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const { sortOrder } = req.body;
  if (typeof sortOrder !== 'number') { sendError(res, 'sortOrder (number) is required', 'VALIDATION_ERROR'); return; }
  const game = await prisma.game.update({ where: { id: gameId }, data: { sortOrder } });
  sendSuccess(res, { id: game.id, sortOrder: game.sortOrder }, 'Sort order updated');
}

/** Get or upsert denomination config for a game */
export async function getGameDenominations(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const config = await prisma.gameDenominationConfig.findUnique({ where: { gameId } });
  sendSuccess(res, config || { gameId, denominations: '[1000,5000,50000,100000]', minBet: 100, maxBet: 1000000 });
}

export async function upsertGameDenominations(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const { denominations, minBet, maxBet } = req.body;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) { sendError(res, 'Game not found', 'NOT_FOUND', 404); return; }

  // Validate denominations is an array of positive numbers
  let denomArr: number[];
  try {
    denomArr = JSON.parse(denominations);
    if (!Array.isArray(denomArr) || denomArr.some(d => typeof d !== 'number' || d <= 0)) throw new Error();
  } catch {
    sendError(res, 'denominations must be a JSON array of positive numbers', 'VALIDATION_ERROR');
    return;
  }

  const config = await prisma.gameDenominationConfig.upsert({
    where: { gameId },
    update: { denominations: JSON.stringify(denomArr), minBet: minBet ?? 100, maxBet: maxBet ?? 1000000, updatedBy: req.player?.playerId },
    create: { id: uuidv4(), gameId, denominations: JSON.stringify(denomArr), minBet: minBet ?? 100, maxBet: maxBet ?? 1000000, updatedBy: req.player?.playerId },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'GAME_DENOMINATIONS_UPDATED', entityType: 'game', entityId: gameId,
    after: { denominations: denomArr, minBet, maxBet },
  });

  sendSuccess(res, config, 'Denominations updated');
}

// ─── Package Betting CRUD ─────────────────────────────────────────────────────

export async function listGamePackages(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const packages = await prisma.gamePackage.findMany({
    where: { gameId },
    orderBy: { sortOrder: 'asc' },
  });
  sendSuccess(res, packages);
}

export async function upsertGamePackage(req: Request, res: Response): Promise<void> {
  const { gameId } = req.params;
  const { id, name, optionLabels, price, multiplier, isActive, sortOrder } = req.body;
  if (!name || !optionLabels || !price) {
    sendError(res, 'name, optionLabels, and price are required', 'VALIDATION_ERROR');
    return;
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) { sendError(res, 'Game not found', 'NOT_FOUND', 404); return; }

  const data = {
    gameId,
    name,
    optionLabels: Array.isArray(optionLabels) ? JSON.stringify(optionLabels) : optionLabels,
    price: parseFloat(price),
    multiplier: parseFloat(multiplier ?? 1),
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder ?? 0,
  };

  const pkg = id
    ? await prisma.gamePackage.update({ where: { id }, data })
    : await prisma.gamePackage.create({ data: { id: uuidv4(), ...data } });

  sendSuccess(res, pkg, id ? 'Package updated' : 'Package created', id ? 200 : 201);
}

export async function deleteGamePackage(req: Request, res: Response): Promise<void> {
  const { gameId, packageId } = req.params;
  const pkg = await prisma.gamePackage.findFirst({ where: { id: packageId, gameId } });
  if (!pkg) { sendError(res, 'Package not found', 'NOT_FOUND', 404); return; }
  await prisma.gamePackage.delete({ where: { id: packageId } });
  sendSuccess(res, null, 'Package deleted');
}

// ─── Service Health ───────────────────────────────────────────────────────────

export async function getServiceHealth(req: Request, res: Response): Promise<void> {
  const startMs = Date.now();

  // DB ping
  let dbPingMs = 0;
  let dbOk = false;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbPingMs = Date.now() - t0;
    dbOk = true;
  } catch { dbPingMs = -1; }

  // Pending migrations
  let pendingMigrations = 0;
  try {
    const migrations = await prisma.$queryRaw<{ migration_name: string; finished_at: string | null }[]>`
      SELECT migration_name, finished_at FROM _prisma_migrations WHERE finished_at IS NULL
    `;
    pendingMigrations = (migrations as unknown[]).length;
  } catch { /* table may not exist in some setups */ }

  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const snapshot = {
    uptimeSeconds,
    dbPingMs,
    dbOk,
    memUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    memTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    pendingMigrations,
    responseMs: Date.now() - startMs,
    apiVersion: '1.0.0',
    timestamp: new Date().toISOString(),
  };

  // Persist for trend tracking (fire-and-forget)
  prisma.serviceHealthSnapshot.create({
    data: {
      id: uuidv4(),
      uptimeSeconds,
      dbPingMs,
      memUsedMb: snapshot.memUsedMb,
      memTotalMb: snapshot.memTotalMb,
      nodeVersion: process.version,
      environment: snapshot.environment,
      pendingMigrations,
    },
  }).catch(() => {});

  sendSuccess(res, snapshot);
}

/** Last N health snapshots for trend charts */
export async function getHealthHistory(req: Request, res: Response): Promise<void> {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const snapshots = await prisma.serviceHealthSnapshot.findMany({
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
  sendSuccess(res, snapshots.reverse()); // chronological order for charts
}

// ─── Payment Gateway Config ───────────────────────────────────────────────────

export async function listPaymentConfigs(req: Request, res: Response): Promise<void> {
  const configs = await prisma.paymentGatewayConfig.findMany({ orderBy: { provider: 'asc' } });
  // Mask webhook secrets before returning
  const masked = configs.map(c => ({ ...c, webhookSecret: c.webhookSecret ? '••••••••' : null }));
  sendSuccess(res, masked);
}

export async function upsertPaymentConfig(req: Request, res: Response): Promise<void> {
  const { provider, isEnabled, publicKey, webhookUrl, metadata } = req.body;
  // webhookSecret — only update if explicitly provided (non-empty string)
  const { webhookSecret } = req.body;

  if (!provider) { sendError(res, 'provider is required', 'VALIDATION_ERROR'); return; }

  const existing = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });

  const data: Record<string, unknown> = {
    provider,
    isEnabled: isEnabled ?? false,
    publicKey: publicKey || null,
    webhookUrl: webhookUrl || null,
    metadata: metadata ? JSON.stringify(metadata) : '{}',
    updatedBy: req.player?.playerId,
  };
  // Only overwrite secret if a new one is provided
  if (webhookSecret && webhookSecret !== '••••••••') {
    data.webhookSecret = webhookSecret;
  }

  const config = existing
    ? await prisma.paymentGatewayConfig.update({ where: { provider }, data })
    : await prisma.paymentGatewayConfig.create({ data: { id: uuidv4(), ...(data as Parameters<typeof prisma.paymentGatewayConfig.create>[0]['data']) } });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'PAYMENT_CONFIG_UPDATED', entityType: 'payment_gateway_config', entityId: config.id,
    after: { provider, isEnabled, publicKey, webhookUrl },
  });

  sendSuccess(res, { ...config, webhookSecret: config.webhookSecret ? '••••••••' : null }, 'Payment config saved');
}

export async function listPaymentOrders(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;

  const [orders, total] = await Promise.all([
    prisma.paymentOrder.findMany({
      where: status ? { status } : {},
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { player: { select: { id: true, username: true, email: true } } },
    }),
    prisma.paymentOrder.count({ where: status ? { status } : {} }),
  ]);

  sendSuccess(res, { orders, total, page, limit });
}

// ─── Video Call Access ────────────────────────────────────────────────────────

export async function listVideoCallAccess(req: Request, res: Response): Promise<void> {
  const accesses = await prisma.videoCallAccess.findMany({
    orderBy: { createdAt: 'desc' },
    include: { player: { select: { id: true, username: true, email: true, role: true } } },
  });
  sendSuccess(res, accesses);
}

export async function grantVideoCallAccess(req: Request, res: Response): Promise<void> {
  const { playerId, channelName, role, notes } = req.body;
  if (!playerId) { sendError(res, 'playerId is required', 'VALIDATION_ERROR'); return; }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) { sendError(res, 'Player not found', 'NOT_FOUND', 404); return; }
  if (!['admin', 'super_admin'].includes(player.role)) {
    sendError(res, 'Video call access can only be granted to admin or super_admin accounts', 'FORBIDDEN', 403);
    return;
  }

  const access = await prisma.videoCallAccess.upsert({
    where: { playerId },
    update: { isActive: true, channelName: channelName || 'admin-broadcast', role: role || 'host', notes: notes || null, grantedBy: req.player!.playerId },
    create: { id: uuidv4(), playerId, grantedBy: req.player!.playerId, channelName: channelName || 'admin-broadcast', role: role || 'host', notes: notes || null, isActive: true },
  });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'VIDEO_ACCESS_GRANTED', entityType: 'video_call_access', entityId: access.id,
    after: { playerId, channelName, role },
  });

  sendSuccess(res, access, 'Video call access granted');
}

export async function revokeVideoCallAccess(req: Request, res: Response): Promise<void> {
  const { playerId } = req.params;

  const access = await prisma.videoCallAccess.findUnique({ where: { playerId } });
  if (!access) { sendError(res, 'No video call access found for this player', 'NOT_FOUND', 404); return; }

  await prisma.videoCallAccess.update({ where: { playerId }, data: { isActive: false } });

  await createAuditLog({
    actorId: req.player?.playerId, actorType: 'super_admin',
    action: 'VIDEO_ACCESS_REVOKED', entityType: 'video_call_access', entityId: access.id,
    before: { isActive: true }, after: { isActive: false },
  });

  sendSuccess(res, null, 'Video call access revoked');
}
