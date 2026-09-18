import { Router } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth';
import { initiatePayment, stripeWebhook, validateReceipt } from '../controllers/payment.controller';

const router = Router();

// Stripe webhook needs raw body for signature verification
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

// Authenticated routes
router.post('/initiate', authenticate, initiatePayment);
router.post('/validate-receipt', authenticate, validateReceipt);

export default router;
