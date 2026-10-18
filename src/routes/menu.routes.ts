// src/routes/menu.routes.ts
import { Router } from 'express';
import {
    getRestaurantMenu,
    getAllMenus,
    getFeaturedMenus,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem
} from '../controllers/menu.controller.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../validations/menu.validation.js';
import { validate } from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// ==========================================
// PUBLIC ROUTES (Explore & Home Page)
// ==========================================

// GET /api/menus - Fetch all menus with optional search & filter query params (cuisine, q, neighborhood)
router.get('/', getAllMenus);

// GET /api/menus/featured - Fetch exactly top 6 featured menus for the home page
router.get('/featured', getFeaturedMenus);

// GET /api/menus/restaurant/:restaurantId - View specific restaurant's menu
router.get('/restaurant/:restaurantId', getRestaurantMenu);

// ==========================================
// VENDOR PROTECTED ROUTES
// ==========================================
router.post('/', authenticate, authorize('VENDOR'), validate(createMenuItemSchema), createMenuItem);
router.patch('/:id', authenticate, authorize('VENDOR'), validate(updateMenuItemSchema), updateMenuItem);
router.delete('/:id', authenticate, authorize('VENDOR'), deleteMenuItem);

export default router;