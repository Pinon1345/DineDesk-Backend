// src/routes/menu.routes.ts
import { Router } from 'express';
import {
    getRestaurantMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
} from '../controllers/menu.controller.js';

import { createMenuItemSchema, updateMenuItemSchema } from '../validations/menu.validation.js';
import { validate } from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';
import { authenticate } from '../middlewares/authenticate.js';


const router = Router();

// Public route to view a restaurant's menu
router.get('/restaurant/:restaurantId', getRestaurantMenu);

// Vendor protected routes
router.post('/', authenticate, authorize('VENDOR'), validate(createMenuItemSchema), createMenuItem);
router.patch('/:id', authenticate, authorize('VENDOR'), validate(updateMenuItemSchema), updateMenuItem);
router.delete('/:id', authenticate, authorize('VENDOR'), deleteMenuItem);

export default router;