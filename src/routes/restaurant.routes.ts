// src/routes/restaurant.routes.ts
import { Router } from 'express';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    getMyRestaurant,
    getVendorRestaurantProfile,
    updateVendorRestaurantProfile,
    getKitchenStatus,
    updateKitchenStatus,
} from '../controllers/restaurant.controller.js';

import { createRestaurantSchema } from '../validations/restaurant.validation.js';
import { validate } from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// ==========================================
// KITCHEN STATUS SYNC ROUTES (POSTGRESQL BACKED)
// Registered BEFORE /:id to prevent routing collisions
// ==========================================

// GET /api/v1/restaurants/kitchen-status - Public endpoint for clients/customers to check live kitchen state
router.get('/kitchen-status', getKitchenStatus);

// PATCH /api/v1/restaurants/kitchen-status - Vendor/Manager endpoint to toggle kitchen open/paused globally
router.patch(
    '/kitchen-status',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    updateKitchenStatus
);

// ==========================================
// VENDOR PORTAL ROUTES
// ==========================================

// GET /api/v1/restaurants/vendor/profile - Fetch real restaurant profile from database
router.get(
    '/vendor/profile',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    getVendorRestaurantProfile
);

// PUT & PATCH /api/v1/restaurants/vendor/profile - Update restaurant profile in PostgreSQL
router.put(
    '/vendor/profile',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    updateVendorRestaurantProfile
);
router.patch(
    '/vendor/profile',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    updateVendorRestaurantProfile
);

// GET /api/v1/restaurants/vendor/me - Legacy vendor current restaurant route
router.get(
    '/vendor/me',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    getMyRestaurant
);

// POST /api/v1/restaurants - Create new restaurant profile (Vendor only)
router.post(
    '/',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    validate(createRestaurantSchema),
    createRestaurant
);

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/v1/restaurants - List all published restaurants
router.get('/', getRestaurants);

// GET /api/v1/restaurants/:id - View single restaurant by ID with menus and reviews
router.get('/:id', getRestaurantById);

export default router;