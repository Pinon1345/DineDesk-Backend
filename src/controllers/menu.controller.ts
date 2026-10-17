// src/controllers/menu.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// Get all menu items for a specific restaurant (Public)
export const getRestaurantMenu = async (req: Request, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params;
        const { category } = req.query;

        const where: any = { restaurantId: restaurantId as string, isPublished: true };
        if (category) {
            where.category = category as string;
        }

        const menuItems = await prisma.menuItem.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: menuItems });
    } catch (error) {
        console.error('Get menu error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Create a menu item (Vendor only - must own the restaurant)
export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Find vendor's restaurant
        const restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'You must create a restaurant profile first' });
            return;
        }

        const menuItem = await prisma.menuItem.create({
            data: {
                restaurantId: restaurant.id,
                ...req.body,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: menuItem,
        });
    } catch (error) {
        console.error('Create menu item error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Update a menu item (Vendor only)
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        // Check if item belongs to vendor's restaurant
        const menuItem = await prisma.menuItem.findUnique({
            where: { id: id as string },
            include: { restaurant: true },
        });

        if (!menuItem || menuItem.restaurant.ownerId !== req.user.id) {
            res.status(404).json({ success: false, message: 'Menu item not found or unauthorized' });
            return;
        }

        const updatedItem = await prisma.menuItem.update({
            where: { id: id as string },
            data: req.body,
        });

        res.status(200).json({
            success: true,
            message: 'Menu item updated successfully',
            data: updatedItem,
        });
    } catch (error) {
        console.error('Update menu item error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Delete a menu item (Vendor only)
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;

        const menuItem = await prisma.menuItem.findUnique({
            where: { id: id as string },
            include: { restaurant: true },
        });

        if (!menuItem || menuItem.restaurant.ownerId !== req.user.id) {
            res.status(404).json({ success: false, message: 'Menu item not found or unauthorized' });
            return;
        }

        await prisma.menuItem.delete({
            where: { id: id as string },
        });

        res.status(200).json({
            success: true,
            message: 'Menu item deleted successfully',
        });
    } catch (error) {
        console.error('Delete menu item error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};