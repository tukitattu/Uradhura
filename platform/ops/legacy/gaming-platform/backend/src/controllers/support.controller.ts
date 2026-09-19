import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../services/audit.service';

// Player: Create a support ticket
export async function createTicket(req: Request, res: Response): Promise<void> {
  const { subject, description, category, priority } = req.body;
  const playerId = req.player!.playerId;

  if (!subject || !description) {
    sendError(res, 'subject and description are required', 'VALIDATION_ERROR');
    return;
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      id: uuidv4(),
      playerId,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
    },
  });

  // Add initial message
  await prisma.supportMessage.create({
    data: {
      id: uuidv4(),
      ticketId: ticket.id,
      senderId: playerId,
      senderType: 'player',
      message: description,
    },
  });

  await createAuditLog({
    actorId: playerId, actorType: 'player',
    action: 'SUPPORT_TICKET_CREATED', entityType: 'support_ticket', entityId: ticket.id,
    after: { subject, category, priority },
  });

  sendSuccess(res, ticket, 'Ticket created', 201);
}

// Player: List their tickets
export async function listMyTickets(req: Request, res: Response): Promise<void> {
  const playerId = req.player!.playerId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { playerId },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
    }),
    prisma.supportTicket.count({ where: { playerId } }),
  ]);

  sendSuccess(res, { tickets, total, page, limit });
}

// Player/Admin: Get ticket detail with messages
export async function getTicketDetail(req: Request, res: Response): Promise<void> {
  const { ticketId } = req.params;
  const playerId = req.player!.playerId;
  const role = req.player!.role;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      messages: {
        where: role === 'super_admin' ? {} : { isInternal: false },
        orderBy: { createdAt: 'asc' },
      },
      player: { select: { id: true, username: true, email: true } },
    },
  });

  if (!ticket) {
    sendError(res, 'Ticket not found', 'NOT_FOUND', 404);
    return;
  }

  // Players can only see their own tickets
  if (role === 'player' && ticket.playerId !== playerId) {
    sendError(res, 'Access denied', 'FORBIDDEN', 403);
    return;
  }

  sendSuccess(res, ticket);
}

// Player/Admin: Reply to a ticket
export async function replyToTicket(req: Request, res: Response): Promise<void> {
  const { ticketId } = req.params;
  const { message, isInternal } = req.body;
  const playerId = req.player!.playerId;
  const role = req.player!.role;

  if (!message) {
    sendError(res, 'message is required', 'VALIDATION_ERROR');
    return;
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    sendError(res, 'Ticket not found', 'NOT_FOUND', 404);
    return;
  }

  // Players can only reply to their own tickets
  if (role === 'player' && ticket.playerId !== playerId) {
    sendError(res, 'Access denied', 'FORBIDDEN', 403);
    return;
  }

  // Only admins can mark as internal
  const internal = role !== 'player' && isInternal === true;

  const msg = await prisma.supportMessage.create({
    data: {
      id: uuidv4(),
      ticketId,
      senderId: playerId,
      senderType: role === 'player' ? 'player' : 'admin',
      message,
      isInternal: internal,
    },
  });

  // Update ticket status if admin replies
  if (role !== 'player' && ticket.status === 'open') {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'in_progress', assignedTo: playerId, assignedAt: new Date() },
    });
  }

  sendSuccess(res, msg, 'Reply sent', 201);
}

// Admin: List all tickets
export async function listAllTickets(req: Request, res: Response): Promise<void> {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string;
  const category = req.query.category as string;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        player: { select: { id: true, username: true, email: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  sendSuccess(res, { tickets, total, page, limit });
}

// Admin: Update ticket status
export async function updateTicketStatus(req: Request, res: Response): Promise<void> {
  const { ticketId } = req.params;
  const { status, assignedTo } = req.body;
  const adminId = req.player!.playerId;

  const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
  if (status && !validStatuses.includes(status)) {
    sendError(res, `status must be one of: ${validStatuses.join(', ')}`, 'VALIDATION_ERROR');
    return;
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    sendError(res, 'Ticket not found', 'NOT_FOUND', 404);
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (status) {
    updateData.status = status;
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }
  }
  if (assignedTo) {
    updateData.assignedTo = assignedTo;
    updateData.assignedAt = new Date();
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: updateData,
  });

  await createAuditLog({
    actorId: adminId, actorType: 'admin',
    action: 'SUPPORT_TICKET_UPDATED', entityType: 'support_ticket', entityId: ticketId,
    after: updateData,
  });

  sendSuccess(res, updated, 'Ticket updated');
}
