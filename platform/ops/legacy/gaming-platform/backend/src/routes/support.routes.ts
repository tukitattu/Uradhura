import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  createTicket,
  listMyTickets,
  getTicketDetail,
  replyToTicket,
  listAllTickets,
  updateTicketStatus,
} from '../controllers/support.controller';

const router = Router();

// Player routes
router.post('/', authenticate, createTicket);
router.get('/my', authenticate, listMyTickets);

// Shared routes (player sees own, admin sees all)
router.get('/:ticketId', authenticate, getTicketDetail);
router.post('/:ticketId/reply', authenticate, replyToTicket);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, listAllTickets);
router.patch('/admin/:ticketId/status', authenticate, requireAdmin, updateTicketStatus);

export default router;
