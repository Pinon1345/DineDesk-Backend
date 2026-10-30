// src/routes/order.routes.ts
import { Router } from 'express';
import { createOrderSchema } from '../validations/order.validation.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import {
    createOrder,
    confirmStripePayment,
    getMyOrders,
    getOrderById,
    cancelOrder,
    getVendorAnalytics,
    getVendorOrders,
    updateOrderStatusByVendor,
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// VENDOR SPECIFIC ROUTES (Must precede /:id)
router.get('/vendor/analytics', getVendorAnalytics);
router.get('/vendor/queue', getVendorOrders);
router.patch('/vendor/:id/status', updateOrderStatusByVendor);

// CUSTOMER / PAYMENT CONFIRMATION (Must precede /:id)
router.post('/confirm-payment', confirmStripePayment);

// CUSTOMER / GENERAL ROUTES
router.post('/', validate(createOrderSchema), createOrder);
router.get('/my', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);
router.patch('/:id/cancel', cancelOrder);

export default router;