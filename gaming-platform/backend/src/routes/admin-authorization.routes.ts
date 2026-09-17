import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../services/audit.service';

const router = Router();

router.use(authenticate);

router.get('/requests', requireSuperAdmin, async (_req, res) => {
  const requests = await prisma.adminAuthorizationRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { player: { select: { id: true, username: true, email: true, role: true } } },
  });

  sendSuccess(res, requests, 'Admin authorization requests loaded');
});

router.post('/request', async (req, res) => {
  const { requestedRole = 'admin', requestedPermissions, notes } = req.body;

  if (!req.player) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }

  const existing = await prisma.adminAuthorizationRequest.findFirst({
    where: {
      playerId: req.player.playerId,
      status: 'pending',
    },
  });

  if (existing) {
    sendError(res, 'You already have a pending admin authorization request', 'REQUEST_EXISTS', 409);
    return;
  }

  const request = await prisma.adminAuthorizationRequest.create({
    data: {
      id: uuidv4(),
      playerId: req.player.playerId,
      requestedRole,
      requestedPermissions: requestedPermissions ? JSON.stringify(requestedPermissions) : null,
      notes: notes || null,
      status: 'pending',
    },
    include: { player: { select: { id: true, username: true, email: true, role: true } } },
  });

  await createAuditLog({
    actorId: req.player.playerId,
    actorType: req.player.role,
    action: 'ADMIN_REQUEST_CREATED',
    entityType: 'admin_authorization_request',
    entityId: request.id,
    after: { requestedRole, requestedPermissions, notes },
  });

  sendSuccess(res, request, 'Admin authorization request submitted for review', 202);
});

router.post('/:requestId/approve', requireSuperAdmin, async (req, res) => {
  const { requestId } = req.params;
  const { notes } = req.body;

  if (!req.player) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }

  const request = await prisma.adminAuthorizationRequest.findUnique({
    where: { id: requestId },
    include: { player: true },
  });

  if (!request) {
    sendError(res, 'Authorization request not found', 'NOT_FOUND', 404);
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.adminAuthorizationRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        reviewedBy: req.player!.playerId,
        reviewedAt: new Date(),
        notes: notes || request.notes,
      },
      include: { player: { select: { id: true, username: true, email: true, role: true } } },
    });

    await tx.player.update({
      where: { id: request.playerId },
      data: { role: request.requestedRole || 'admin' },
    });

    return next;
  });

  await createAuditLog({
    actorId: req.player.playerId,
    actorType: 'super_admin',
    action: 'ADMIN_REQUEST_APPROVED',
    entityType: 'admin_authorization_request',
    entityId: requestId,
    after: { status: 'approved', approvedRole: request.requestedRole || 'admin', notes },
  });

  sendSuccess(res, updated, 'Admin request approved');
});

router.post('/:requestId/reject', requireSuperAdmin, async (req, res) => {
  const { requestId } = req.params;
  const { notes } = req.body;

  if (!req.player) {
    sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    return;
  }

  const request = await prisma.adminAuthorizationRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    sendError(res, 'Authorization request not found', 'NOT_FOUND', 404);
    return;
  }

  const updated = await prisma.adminAuthorizationRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedBy: req.player.playerId,
      reviewedAt: new Date(),
      notes: notes || request.notes,
    },
  });

  await createAuditLog({
    actorId: req.player.playerId,
    actorType: 'super_admin',
    action: 'ADMIN_REQUEST_REJECTED',
    entityType: 'admin_authorization_request',
    entityId: requestId,
    after: { status: 'rejected', notes },
  });

  sendSuccess(res, updated, 'Admin request rejected');
});

export default router;
