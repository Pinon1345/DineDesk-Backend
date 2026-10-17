// src/controllers/cart.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// Get user's cart items
export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const cartItems = await prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: {
                menuItem: {
                    include: {
                        restaurant: { select: { id: true, name: true, coverUrl: true } },
                    },
                },
            },
        });

        // Calculate subtotal
        let subtotal = 0;
        cartItems.forEach((item) => {
            subtotal += Number(item.menuItem.price) * item.quantity;
        });

        res.status(200).json({
            success: true,
            data: {
                items: cartItems,
                subtotal,
            },
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Add item to cart (Ensures items in cart belong to the same restaurant)
export const addToCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { menuItemId, quantity } = req.body;

        // Check if menu item exists and is available
        const menuItem = await prisma.menuItem.findUnique({
            where: { id: menuItemId as string },
            include: { restaurant: true },
        });

        if (!menuItem || !menuItem.isAvailable || !menuItem.isPublished) {
            res.status(404).json({ success: false, message: 'Menu item not found or unavailable' });
            return;
        }

        // Check if user already has items from a different restaurant in the cart
        const existingCartItems = await prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: { menuItem: true },
        });

        if (existingCartItems.length > 0 && existingCartItems[0]?.menuItem) {
            const currentRestaurantId = existingCartItems[0]?.menuItem?.restaurantId;
            if (currentRestaurantId !== menuItem.restaurantId) {
                res.status(400).json({
                    success: false,
                    message: 'You can only order from one restaurant at a time. Please clear your cart first.',
                });
                return;
            }
        }

        // Upsert cart item (increment quantity if already exists)
        const cartItem = await prisma.cartItem.upsert({
            where: {
                userId_menuItemId: {
                    userId: req.user.id,
                    menuItemId: menuItemId as string,
                },
            },
            update: {
                quantity: { increment: quantity },
            },
            create: {
                userId: req.user.id,
                menuItemId: menuItemId as string,
                quantity,
            },
            include: {
                menuItem: true,
            },
        });

        res.status(200).json({
            success: true,
            message: 'Item added to cart successfully',
            data: cartItem,
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { quantity } = req.body;

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: id as string },
        });

        if (!cartItem || cartItem.userId !== req.user.id) {
            res.status(404).json({ success: false, message: 'Cart item not found' });
            return;
        }

        const updatedItem = await prisma.cartItem.update({
            where: { id: id as string },
            data: { quantity },
        });

        res.status(200).json({
            success: true,
            message: 'Cart updated successfully',
            data: updatedItem,
        });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Remove single item from cart
export const removeCartItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        const cartItem = await prisma.cartItem.findUnique({
            where: { id: id as string },
        });

        if (!cartItem || cartItem.userId !== req.user.id) {
            res.status(404).json({ success: false, message: 'Cart item not found' });
            return;
        }

        await prisma.cartItem.delete({
            where: { id: id as string },
        });

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
        });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Clear entire cart
export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        await prisma.cartItem.deleteMany({
            where: { userId: req.user.id },
        });

        res.status(200).json({
            success: true,
            message: 'Cart cleared successfully',
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};