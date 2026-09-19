import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  initiateCustomPayment,
  confirmPayment,
  cancelPayment,
  getMyPaymentOrders,
  customPaymentWebhook,
} from '../controllers/payment-custom.controller';

const router = Router();

// Player routes
router.post('/purchase', authenticate, initiateCustomPayment);
router.get('/my-orders', authenticate, getMyPaymentOrders);

// Admin routes
router.post('/confirm/:orderId', authenticate, requireAdmin, confirmPayment);
router.post('/cancel/:orderId', authenticate, requireAdmin, cancelPayment);

// Webhook (no auth - external provider calls this)
router.post('/webhook/custom', customPaymentWebhook);

export default router;
