// src/routes/order.routes.ts
import { Router } from 'express';
import { createOrderSchema } from '../validations/order.validation.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrder,
} from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

// Place an order
router.post('/', validate(createOrderSchema), createOrder);

// Fetch user's orders list
router.get('/my', getMyOrders);

// Fetch a single order by ID (Required for Live Tracker / Confirmation page)
router.get('/:id', getOrderById);

// Order cancellation endpoints
router.put('/:id/cancel', cancelOrder);
router.patch('/:id/cancel', cancelOrder);

export default router;