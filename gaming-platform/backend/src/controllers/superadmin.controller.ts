import { Request, Response } from 'express';
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
  const { tokens } = req.body; // Array<{ scope, key, value, label }>
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
  // Merge with games
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

  // Also update game name if displayName provided
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

// ─── Platform Info (read-only for SA) ─────────────────────────────────────────

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
