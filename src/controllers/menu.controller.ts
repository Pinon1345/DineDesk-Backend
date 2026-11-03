// src/controllers/menu.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';

function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1] || null;
    }
    if (authHeader) return authHeader;
    if ((req as any).cookies?.token) return (req as any).cookies.token;
    if ((req as any).cookies?.accessToken) return (req as any).cookies.accessToken;

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)(?:token|dinedesk_auth_token|auth_token|accessToken)=([^;]+)/);
        if (match && match[1]) return match[1].trim();
    }
    return null;
}

function resolveUserId(req: Request): string | null {
    if ((req as any).user?.id) return (req as any).user.id;
    if ((req as any).user?.userId) return (req as any).user.userId;

    const token = extractToken(req);
    if (token) {
        try {
            const secret = process.env.JWT_SECRET || 'super secret jwt key change this';
            const decoded: any = jwt.verify(token, secret);
            return decoded.id || decoded.userId || decoded._id || null;
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Get all menu items with optional filtering and search (Public / Explore Page)
export const getAllMenus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cuisine, q, neighborhood, featured } = req.query;
        const where: any = { isPublished: true, isAvailable: true };

        if (cuisine && cuisine !== 'all') {
            where.cuisineCategory = String(cuisine).toLowerCase();
        }
        if (neighborhood) {
            where.neighborhood = { contains: String(neighborhood), mode: 'insensitive' };
        }
        if (featured === 'true') {
            where.featured = true;
        }
        if (q) {
            where.OR = [
                { menuName: { contains: String(q), mode: 'insensitive' } },
                { name: { contains: String(q), mode: 'insensitive' } },
                { restaurantName: { contains: String(q), mode: 'insensitive' } },
                { description: { contains: String(q), mode: 'insensitive' } },
            ];
        }

        const menus = await prisma.menuItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: menus });
    } catch (error: any) {
        console.error('Get all menus error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Get top 6 featured menus
export const getFeaturedMenus = async (req: Request, res: Response): Promise<void> => {
    try {
        const featuredMenus = await prisma.menuItem.findMany({
            where: { featured: true, isPublished: true, isAvailable: true },
            take: 6,
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: featuredMenus });
    } catch (error: any) {
        console.error('Get featured menus error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Get all menu items for a specific restaurant
export const getRestaurantMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params;
        const { category } = req.query;

        const where: any = { restaurantId: String(restaurantId), isPublished: true };
        if (category && category !== 'all') {
            where.category = String(category);
        }

        const menuItems = await prisma.menuItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: menuItems });
    } catch (error: any) {
        console.error('Get menu error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Get all vendor menu items sorted NEWEST FIRST
export const getVendorMenuItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = resolveUserId(req);

        let restaurant = await prisma.restaurant.findFirst({
            where: userId ? { ownerId: userId } : undefined,
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst();
        }

        let menuItems: any[] = [];

        if (restaurant) {
            menuItems = await prisma.menuItem.findMany({
                where: { restaurantId: restaurant.id },
                orderBy: { createdAt: 'desc' }, // Displays newly created dishes first
            });
        }

        if (menuItems.length === 0) {
            menuItems = await prisma.menuItem.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
        }

        res.status(200).json({
            success: true,
            restaurantId: restaurant?.id || (menuItems[0] ? menuItems[0].restaurantId : "restaurant-1"),
            restaurantName: restaurant?.name || (menuItems[0] ? menuItems[0].restaurantName : "The Tavern Dhaka"),
            total: menuItems.length,
            menuItems,
        });
    } catch (error: any) {
        console.error('Get vendor menu items error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Create a menu item with all PostgreSQL mandatory columns
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = resolveUserId(req);

        let restaurant = await prisma.restaurant.findFirst({
            where: userId ? { ownerId: userId } : undefined,
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst();
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'You must have an active restaurant profile to add dishes' });
            return;
        }

        const {
            name,
            menuName,
            description,
            price,
            category,
            cuisineCategory,
            priceTier,
            imageUrl,
            image,
            badge,
            neighborhood,
            deliveryTime,
            deliveryFee,
            isAvailable,
            isHalal,
            isVegetarianFriendly,
            isKidFriendly,
            isDineIn,
            isDelivery,
            featured,
        } = req.body || {};

        const dishTitle = name || menuName || 'New Culinary Dish';
        const photoUrl =
            imageUrl ||
            image ||
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

        const newItem = await prisma.menuItem.create({
            data: {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                name: dishTitle,
                menuName: dishTitle,
                description: description || '',
                price: Number(price) || 0.0,
                category: category || 'Mains',
                cuisineCategory: (cuisineCategory || 'asian').toLowerCase(),
                priceTier: priceTier || '$$',
                rating: 4.8,
                reviewCount: 1,
                deliveryTime: deliveryTime || '25-35 mins',
                deliveryFee: Number(deliveryFee) || 5.0,
                image: photoUrl,
                imageUrl: photoUrl,
                imageAlt: dishTitle,
                badge: badge || null,
                neighborhood: neighborhood || restaurant.address || 'Dhanmondi Satmasjid Rd',
                isOpen: true,
                isHalal: isHalal !== undefined ? Boolean(isHalal) : true,
                isVegetarianFriendly: isVegetarianFriendly !== undefined ? Boolean(isVegetarianFriendly) : false,
                isKidFriendly: isKidFriendly !== undefined ? Boolean(isKidFriendly) : true,
                isDineIn: isDineIn !== undefined ? Boolean(isDineIn) : true,
                isDelivery: isDelivery !== undefined ? Boolean(isDelivery) : true,
                featured: featured !== undefined ? Boolean(featured) : false,
                isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
                isPublished: true,
                soldCount: 0,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Menu dish published successfully in database!',
            menuItem: newItem,
            data: newItem,
        });
    } catch (error: any) {
        console.error('Create menu item error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Update a menu item in PostgreSQL
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const existingItem = await prisma.menuItem.findUnique({
            where: { id: String(id) },
        });

        if (!existingItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

        const {
            name,
            menuName,
            description,
            price,
            category,
            cuisineCategory,
            priceTier,
            imageUrl,
            image,
            badge,
            neighborhood,
            deliveryTime,
            deliveryFee,
            isAvailable,
            isPublished,
            isHalal,
            isVegetarianFriendly,
            isKidFriendly,
            isDineIn,
            isDelivery,
            featured,
        } = req.body || {};

        const dishTitle = name || menuName || existingItem.name || existingItem.menuName;
        const photoUrl = imageUrl || image || existingItem.imageUrl || existingItem.image;

        const updatedItem = await prisma.menuItem.update({
            where: { id: String(id) },
            data: {
                name: dishTitle,
                menuName: dishTitle,
                description: description !== undefined ? description : existingItem.description,
                price: price !== undefined ? Number(price) : existingItem.price,
                category: category !== undefined ? category : existingItem.category,
                cuisineCategory: cuisineCategory !== undefined ? String(cuisineCategory).toLowerCase() : existingItem.cuisineCategory,
                priceTier: priceTier !== undefined ? priceTier : existingItem.priceTier,
                neighborhood: neighborhood !== undefined ? neighborhood : existingItem.neighborhood,
                deliveryTime: deliveryTime !== undefined ? deliveryTime : existingItem.deliveryTime,
                deliveryFee: deliveryFee !== undefined ? Number(deliveryFee) : existingItem.deliveryFee,
                image: photoUrl || undefined,
                imageUrl: photoUrl || undefined,
                imageAlt: dishTitle,
                badge: badge !== undefined ? badge : existingItem.badge,
                isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existingItem.isAvailable,
                isPublished: isPublished !== undefined ? Boolean(isPublished) : existingItem.isPublished,
                isHalal: isHalal !== undefined ? Boolean(isHalal) : existingItem.isHalal,
                isVegetarianFriendly: isVegetarianFriendly !== undefined ? Boolean(isVegetarianFriendly) : existingItem.isVegetarianFriendly,
                isKidFriendly: isKidFriendly !== undefined ? Boolean(isKidFriendly) : existingItem.isKidFriendly,
                isDineIn: isDineIn !== undefined ? Boolean(isDineIn) : existingItem.isDineIn,
                isDelivery: isDelivery !== undefined ? Boolean(isDelivery) : existingItem.isDelivery,
                featured: featured !== undefined ? Boolean(featured) : existingItem.featured,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Menu dish updated successfully',
            menuItem: updatedItem,
            data: updatedItem,
        });
    } catch (error: any) {
        console.error('Update menu item error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Delete a menu item
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const existingItem = await prisma.menuItem.findUnique({
            where: { id: String(id) },
        });

        if (!existingItem) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

        await prisma.menuItem.delete({
            where: { id: String(id) },
        });

        res.status(200).json({
            success: true,
            message: 'Menu item deleted successfully from database',
        });
    } catch (error: any) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Toggle dish availability
export const toggleAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const item = await prisma.menuItem.findUnique({
            where: { id: String(id) },
        });

        if (!item) {
            res.status(404).json({ success: false, message: 'Menu item not found' });
            return;
        }

        const updated = await prisma.menuItem.update({
            where: { id: String(id) },
            data: {
                isAvailable: !item.isAvailable,
            },
        });

        res.status(200).json({
            success: true,
            message: `Dish availability changed to ${updated.isAvailable ? 'In Stock' : 'Sold Out'}`,
            menuItem: updated,
            isAvailable: updated.isAvailable,
        });
    } catch (error: any) {
        console.error('Toggle availability error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};