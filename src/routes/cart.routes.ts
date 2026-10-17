// src/routes/cart.routes.ts
import { Router } from 'express';
import {
    getCart,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
} from '../controllers/cart.controller.js';

import { addToCartSchema, updateCartItemSchema } from '../validations/cart.validation.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// All cart routes require user authentication

router.use(authenticate);

router.get('/', getCart);
router.post('/', validate(addToCartSchema), addToCart);
router.patch('/:id', validate(updateCartItemSchema), updateCartItem);
router.delete('/:id', removeCartItem);
router.delete('/', clearCart);

export default router;