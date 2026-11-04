// src/routes/admin.routes.ts
import { Router } from 'express';
import {
    getAdminOverviewData,
    getAdminAnalyticsData,
    getVendorOrders,
    updateOrderStatus,
    getPendingRestaurants,
    updateRestaurantStatus,
} from '../controllers/admin.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

const router = Router();

// Apply authentication middleware globally across all admin & vendor operations
router.use(authenticate);

// ==========================================
// 1. EXECUTIVE TELEMETRY & OVERVIEW
// ==========================================
// Supports both path prefixes for frontend flexibility:
// e.g., /api/v1/admin/overview or /api/v1/overview
router.get('/overview', authorize('ADMIN', 'SUPERADMIN'), getAdminOverviewData);
router.get('/admin/overview', authorize('ADMIN', 'SUPERADMIN'), getAdminOverviewData);

// ==========================================
// 2. PERFORMANCE ANALYTICS & REVENUE TRENDS
// ==========================================
// Supports both path prefixes:
// e.g., /api/v1/admin/analytics or /api/v1/analytics
router.get('/analytics', authorize('ADMIN', 'SUPERADMIN'), getAdminAnalyticsData);
router.get('/admin/analytics', authorize('ADMIN', 'SUPERADMIN'), getAdminAnalyticsData);

// ==========================================
// 3. VENDOR FLOOR & ORDER ROUTES
// ==========================================
router.get('/vendor/orders', authorize('VENDOR'), getVendorOrders);
router.patch('/vendor/orders/:id/status', authorize('VENDOR'), updateOrderStatus);

// ==========================================
// 4. ADMIN & SUPER ADMIN RESTAURANT APPROVALS
// ==========================================
router.get('/admin/restaurants/pending', authorize('ADMIN', 'SUPERADMIN'), getPendingRestaurants);
router.patch('/admin/restaurants/:id/status', authorize('ADMIN', 'SUPERADMIN'), updateRestaurantStatus);

export default router;