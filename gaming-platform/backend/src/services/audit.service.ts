import prisma from '../config/database';
import logger from '../utils/logger';

export interface AuditEntry {
  actorId?: string;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: object;
  after?: object;
  ipAddress?: string;
  requestId?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        actorType: entry.actorType || 'system',
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        before: entry.before ? JSON.stringify(entry.before) : null,
        after: entry.after ? JSON.stringify(entry.after) : null,
        ipAddress: entry.ipAddress,
        requestId: entry.requestId,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error, entry });
  }
}
