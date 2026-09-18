import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../services/audit.service';
import {
  grantPermission,
  revokePermission,
  getAdminPermissions,
  hasPermission,
  PERMISSION_PRESETS,
} from '../services/permission.service';

// Superadmin: Grant permission to an admin
export async function grantAdminPermission(req: Request, res: Response): Promise<void> {
  const { adminId, permission, scope, expiresAt, notes } = req.body;
  const grantedBy = req.player!.playerId;

  if (!adminId || !permission || !scope) {
    sendError(res, 'adminId, permission, and scope are required', 'VALIDATION_ERROR');
    return;
  }

  // Verify target is an admin
  const target = await prisma.player.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!target) {
    sendError(res, 'Admin not found', 'NOT_FOUND', 404);
    return;
  }
  if (target.role === 'super_admin') {
    sendError(res, 'Cannot modify super_admin permissions', 'FORBIDDEN', 403);
    return;
  }

  const perm = await grantPermission(
    adminId, permission, scope, grantedBy,
    expiresAt ? new Date(expiresAt) : undefined,
    notes
  );

  await createAuditLog({
    actorId: grantedBy, actorType: 'super_admin',
    action: 'PERMISSION_GRANTED', entityType: 'admin_permission', entityId: perm.id,
    after: { adminId, permission, scope },
  });

  sendSuccess(res, perm, 'Permission granted', 201);
}

// Superadmin: Revoke permission
export async function revokeAdminPermission(req: Request, res: Response): Promise<void> {
  const { adminId, permission } = req.params;
  const adminIdReq = req.player!.playerId;

  await revokePermission(adminId, permission);

  await createAuditLog({
    actorId: adminIdReq, actorType: 'super_admin',
    action: 'PERMISSION_REVOKED', entityType: 'admin_permission',
    after: { adminId, permission },
  });

  sendSuccess(res, null, 'Permission revoked');
}

// Superadmin: Get all permissions for an admin
export async function getAdminPermissionsList(req: Request, res: Response): Promise<void> {
  const { adminId } = req.params;
  const permissions = await getAdminPermissions(adminId);
  sendSuccess(res, permissions);
}

// Superadmin: Bulk grant preset permissions
export async function grantPresetPermissions(req: Request, res: Response): Promise<void> {
  const { adminId, preset, gameSlug } = req.body;
  const grantedBy = req.player!.playerId;

  if (!adminId || !preset) {
    sendError(res, 'adminId and preset are required', 'VALIDATION_ERROR');
    return;
  }

  const presetPerms = (PERMISSION_PRESETS as any)[preset];
  if (!presetPerms) {
    sendError(res, `Unknown preset: ${preset}. Available: ${Object.keys(PERMISSION_PRESETS).join(', ')}`, 'VALIDATION_ERROR');
    return;
  }

  const perms = typeof presetPerms === 'function' ? presetPerms(gameSlug) : presetPerms;
  const results = [];

  for (const p of perms) {
    const perm = await grantPermission(adminId, p.permission, p.scope, grantedBy);
    results.push(perm);
  }

  await createAuditLog({
    actorId: grantedBy, actorType: 'super_admin',
    action: 'PERMISSIONS_PRESET_GRANTED', entityType: 'admin_permission',
    after: { adminId, preset, count: results.length },
  });

  sendSuccess(res, { granted: results.length, permissions: results }, 'Preset permissions granted');
}

// Admin: Check own permission
export async function checkMyPermission(req: Request, res: Response): Promise<void> {
  const { permission } = req.query;
  const adminId = req.player!.playerId;

  if (!permission || typeof permission !== 'string') {
    sendError(res, 'permission query param is required', 'VALIDATION_ERROR');
    return;
  }

  const allowed = await hasPermission(adminId, permission);
  sendSuccess(res, { permission, allowed });
}

// Admin: List available presets
export async function listPermissionPresets(_req: Request, res: Response): Promise<void> {
  const presets = Object.keys(PERMISSION_PRESETS).map(name => ({
    name,
    description: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }));
  sendSuccess(res, presets);
}
