import prisma from '../config/database';

export type PermissionScope = 'game' | 'settings' | 'features' | 'players' | 'reports' | 'payments' | 'support';

export interface AdminPermissionEntry {
  id: string;
  adminId: string;
  permission: string;
  scope: PermissionScope;
  grantedBy: string;
  isActive: boolean;
  expiresAt: Date | null;
}

/**
 * Check if an admin has a specific permission.
 * super_admin always has all permissions.
 */
export async function hasPermission(
  adminId: string,
  permission: string
): Promise<boolean> {
  const player = await prisma.player.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!player) return false;
  if (player.role === 'super_admin') return true;

  const perm = await prisma.adminPermission.findUnique({
    where: { adminId_permission: { adminId, permission } },
  });

  if (!perm || !perm.isActive) return false;
  if (perm.expiresAt && perm.expiresAt < new Date()) return false;

  return true;
}

/**
 * Check if an admin has any permission in a given scope.
 */
export async function hasScopeAccess(adminId: string, scope: PermissionScope): Promise<boolean> {
  const player = await prisma.player.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!player) return false;
  if (player.role === 'super_admin') return true;

  const count = await prisma.adminPermission.count({
    where: {
      adminId,
      scope,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  return count > 0;
}

/**
 * Get all permissions for an admin.
 */
export async function getAdminPermissions(adminId: string): Promise<AdminPermissionEntry[]> {
  const perms = await prisma.adminPermission.findMany({
    where: {
      adminId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return perms.map(p => ({ ...p, scope: p.scope as PermissionScope }));
}

/**
 * Grant a permission to an admin.
 */
export async function grantPermission(
  adminId: string,
  permission: string,
  scope: PermissionScope,
  grantedBy: string,
  expiresAt?: Date,
  notes?: string
): Promise<AdminPermissionEntry> {
  const result = await prisma.adminPermission.upsert({
    where: { adminId_permission: { adminId, permission } },
    update: { isActive: true, scope, expiresAt: expiresAt || null, notes: notes || null, grantedBy },
    create: { id: crypto.randomUUID(), adminId, permission, scope, grantedBy, expiresAt: expiresAt || null, notes: notes || null },
  });
  return { ...result, scope: result.scope as PermissionScope };
}

/**
 * Revoke a permission from an admin.
 */
export async function revokePermission(adminId: string, permission: string): Promise<void> {
  await prisma.adminPermission.updateMany({
    where: { adminId, permission },
    data: { isActive: false },
  });
}

/**
 * Get permission presets for quick assignment.
 */
export const PERMISSION_PRESETS = {
  game_manager: (gameSlug: string) => [
    { permission: `game:${gameSlug}:view`, scope: 'game' as PermissionScope },
    { permission: `game:${gameSlug}:manage`, scope: 'game' as PermissionScope },
    { permission: `game:${gameSlug}:bets`, scope: 'game' as PermissionScope },
  ],
  settings_admin: [
    { permission: 'settings:platform:edit', scope: 'settings' as PermissionScope },
    { permission: 'settings:security:edit', scope: 'settings' as PermissionScope },
    { permission: 'settings:notifications:edit', scope: 'settings' as PermissionScope },
  ],
  player_manager: [
    { permission: 'players:view', scope: 'players' as PermissionScope },
    { permission: 'players:manage', scope: 'players' as PermissionScope },
    { permission: 'players:override', scope: 'players' as PermissionScope },
  ],
  reports_viewer: [
    { permission: 'reports:bets:view', scope: 'reports' as PermissionScope },
    { permission: 'reports:settlements:view', scope: 'reports' as PermissionScope },
    { permission: 'reports:audit:view', scope: 'reports' as PermissionScope },
  ],
  payment_manager: [
    { permission: 'payments:orders:view', scope: 'payments' as PermissionScope },
    { permission: 'payments:orders:confirm', scope: 'payments' as PermissionScope },
    { permission: 'payments:config:edit', scope: 'payments' as PermissionScope },
  ],
  support_agent: [
    { permission: 'support:tickets:view', scope: 'support' as PermissionScope },
    { permission: 'support:tickets:manage', scope: 'support' as PermissionScope },
    { permission: 'support:tickets:respond', scope: 'support' as PermissionScope },
  ],
  feature_manager: [
    { permission: 'features:manage', scope: 'features' as PermissionScope },
  ],
  full_admin: [
    { permission: 'game:*:view', scope: 'game' as PermissionScope },
    { permission: 'game:*:manage', scope: 'game' as PermissionScope },
    { permission: 'settings:platform:edit', scope: 'settings' as PermissionScope },
    { permission: 'features:manage', scope: 'features' as PermissionScope },
    { permission: 'players:view', scope: 'players' as PermissionScope },
    { permission: 'players:manage', scope: 'players' as PermissionScope },
    { permission: 'reports:bets:view', scope: 'reports' as PermissionScope },
    { permission: 'reports:settlements:view', scope: 'reports' as PermissionScope },
    { permission: 'payments:orders:view', scope: 'payments' as PermissionScope },
    { permission: 'payments:orders:confirm', scope: 'payments' as PermissionScope },
    { permission: 'support:tickets:view', scope: 'support' as PermissionScope },
    { permission: 'support:tickets:manage', scope: 'support' as PermissionScope },
  ],
};
