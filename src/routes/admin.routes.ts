// src/routes/admin.routes.ts
import { Router } from 'express';
import {
    getAdminOverviewData,
    getAdminAnalyticsData,
    getAdminUsers,
    updateUserRole,
    deleteUserAccount,
    getAdminReservations,
    updateReservationStatus,
    getAdminTransactions,
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
// 3. USER MANAGEMENT & RBAC DIRECTORY
// ==========================================
// Supports both path prefixes:
// e.g., /api/v1/admin/users or /api/v1/users
router.get('/users', authorize('ADMIN', 'SUPERADMIN'), getAdminUsers);
router.get('/admin/users', authorize('ADMIN', 'SUPERADMIN'), getAdminUsers);

router.patch('/users/:id/role', authorize('ADMIN', 'SUPERADMIN'), updateUserRole);
router.patch('/admin/users/:id/role', authorize('ADMIN', 'SUPERADMIN'), updateUserRole);

router.delete('/users/:id', authorize('ADMIN', 'SUPERADMIN'), deleteUserAccount);
router.delete('/admin/users/:id', authorize('ADMIN', 'SUPERADMIN'), deleteUserAccount);

// ==========================================
// 4. RESERVATIONS & FLOOR OPERATIONS
// ==========================================
// Supports both path prefixes:
// e.g., /api/v1/admin/reservations or /api/v1/reservations
router.get('/reservations', authorize('ADMIN', 'SUPERADMIN'), getAdminReservations);
router.get('/admin/reservations', authorize('ADMIN', 'SUPERADMIN'), getAdminReservations);

router.patch('/reservations/:id/status', authorize('ADMIN', 'SUPERADMIN'), updateReservationStatus);
router.patch('/admin/reservations/:id/status', authorize('ADMIN', 'SUPERADMIN'), updateReservationStatus);

// ==========================================
// 5. FINANCIAL LEDGER & GUEST SETTLEMENTS
// ==========================================
// Supports both path prefixes:
// e.g., /api/v1/admin/transactions or /api/v1/transactions
router.get('/transactions', authorize('ADMIN', 'SUPERADMIN'), getAdminTransactions);
router.get('/admin/transactions', authorize('ADMIN', 'SUPERADMIN'), getAdminTransactions);

// ==========================================
// 6. VENDOR FLOOR & ORDER ROUTES
// ==========================================
router.get('/vendor/orders', authorize('VENDOR'), getVendorOrders);
router.patch('/vendor/orders/:id/status', authorize('VENDOR'), updateOrderStatus);

// ==========================================
// 7. ADMIN & SUPER ADMIN RESTAURANT APPROVALS
// ==========================================
router.get('/admin/restaurants/pending', authorize('ADMIN', 'SUPERADMIN'), getPendingRestaurants);
router.patch('/admin/restaurants/:id/status', authorize('ADMIN', 'SUPERADMIN'), updateRestaurantStatus);

export default router;