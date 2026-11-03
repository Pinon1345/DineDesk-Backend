// src/routes/menu.routes.ts
import { Router, Request, Response } from 'express';
import {
    getRestaurantMenu,
    getAllMenus,
    getFeaturedMenus,
    getVendorMenuItems,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
} from '../controllers/menu.controller.js';
import { createMenuItemSchema, updateMenuItemSchema } from '../validations/menu.validation.js';
import { validate } from '../middlewares/validate.js';
import { authorize } from '../middlewares/authorize.js';
import { authenticate } from '../middlewares/authenticate.js';
import { upload } from '../middlewares/upload.middleware.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// ==========================================
// VENDOR PORTAL ROUTES
// Must be registered BEFORE /:id or /restaurant/:restaurantId
// ==========================================

// POST /api/v1/menus/vendor/upload-image - Upload dish photo from device directly to Cloudinary
router.post(
    '/vendor/upload-image',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    upload.single('image'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ success: false, message: 'No image file provided' });
                return;
            }

            // Convert in-memory buffer to Base64 Data URI for Cloudinary Uploader
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = `data:${req.file.mimetype};base64,${b64}`;

            const uploadResult = await cloudinary.uploader.upload(dataURI, {
                folder: 'dinedesk/menu_items',
                resource_type: 'image',
                transformation: [
                    { width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
                ],
            });

            res.status(200).json({
                success: true,
                url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            });
        } catch (error: any) {
            console.error('Menu image Cloudinary upload error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Image upload to Cloudinary failed',
            });
        }
    }
);

// GET /api/v1/menus/vendor - Get all items for the logged-in vendor's restaurant
router.get('/vendor', authenticate, authorize('VENDOR', 'ADMIN'), getVendorMenuItems);

// POST /api/v1/menus/vendor - Create new dish in catalog
router.post(
    '/vendor',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    validate(createMenuItemSchema),
    createMenuItem
);

// PUT & PATCH /api/v1/menus/vendor/:id - Update existing dish
router.put(
    '/vendor/:id',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    validate(updateMenuItemSchema),
    updateMenuItem
);
router.patch(
    '/vendor/:id',
    authenticate,
    authorize('VENDOR', 'ADMIN'),
    validate(updateMenuItemSchema),
    updateMenuItem
);

// DELETE /api/v1/menus/vendor/:id - Delete dish from database
router.delete('/vendor/:id', authenticate, authorize('VENDOR', 'ADMIN'), deleteMenuItem);

// PATCH /api/v1/menus/vendor/:id/toggle - Toggle in-stock / sold-out status
router.patch('/vendor/:id/toggle', authenticate, authorize('VENDOR', 'ADMIN'), toggleAvailability);

// ==========================================
// PUBLIC ROUTES (Explore & Storefront)
// ==========================================

// GET /api/v1/menus - Fetch all menus with optional search & filter query params
router.get('/', getAllMenus);

// GET /api/v1/menus/featured - Fetch top 6 featured menus for home page
router.get('/featured', getFeaturedMenus);

// GET /api/v1/menus/restaurant/:restaurantId - View specific restaurant's menu
router.get('/restaurant/:restaurantId', getRestaurantMenu);

// ==========================================
// ROOT VENDOR ALIASES
// ==========================================
router.post('/', authenticate, authorize('VENDOR', 'ADMIN'), validate(createMenuItemSchema), createMenuItem);
router.put('/:id', authenticate, authorize('VENDOR', 'ADMIN'), validate(updateMenuItemSchema), updateMenuItem);
router.patch('/:id', authenticate, authorize('VENDOR', 'ADMIN'), validate(updateMenuItemSchema), updateMenuItem);
router.delete('/:id', authenticate, authorize('VENDOR', 'ADMIN'), deleteMenuItem);

export default router;