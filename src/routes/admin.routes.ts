// src/routes/admin.routes.ts
import { Router } from 'express';
import {
    getVendorOrders,
    updateOrderStatus,
    getPendingRestaurants,
    updateRestaurantStatus,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

const router = Router();

router.use(authenticate);

// Vendor Routes
router.get('/vendor/orders', authorize('VENDOR'), getVendorOrders);
router.patch('/vendor/orders/:id/status', authorize('VENDOR'), updateOrderStatus);

// Admin & Super Admin Routes
router.get('/admin/restaurants/pending', authorize('ADMIN', 'SUPERADMIN'), getPendingRestaurants);
router.patch('/admin/restaurants/:id/status', authorize('ADMIN', 'SUPERADMIN'), updateRestaurantStatus);

export default router;