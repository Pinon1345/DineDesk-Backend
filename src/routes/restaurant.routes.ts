// src/routes/restaurant.routes.ts
import { Router } from 'express';
import {
    getRestaurants,
    getRestaurantById,
    createRestaurant,
    getMyRestaurant,
} from '../controllers/restaurant.controller.js';


import { createRestaurantSchema } from '../validations/restaurant.validation.js';
import { validate } from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();

// Public routes
router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);

// Vendor protected routes
router.post('/', authenticate, authorize('VENDOR'), validate(createRestaurantSchema), createRestaurant);
router.get('/vendor/me', authenticate, authorize('VENDOR'), getMyRestaurant);

export default router;