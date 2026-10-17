// src/routes/order.routes.ts
import { Router } from 'express';
import { createOrderSchema } from '../validations/order.validation.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { createOrder, getMyOrders } from '../controllers/order.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), createOrder);
router.get('/my', getMyOrders);

export default router;