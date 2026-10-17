// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// Vendor: Get incoming orders for their restaurant
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant profile not found' });
            return;
        }

        const orders = await prisma.order.findMany({
            where: { restaurantId: restaurant.id },
            include: { user: { select: { id: true, name: true, phone: true } }, items: true },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Vendor: Update Order Status (e.g., ACCEPTED, PREPARING, OUT_FOR_DELIVERY, DELIVERED)
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { status } = req.body;

        const restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        const order = await prisma.order.findUnique({ where: { id: id as string } });
        if (!order || order.restaurantId !== restaurant.id) {
            res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            return;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: id as string },
            data: { status },
        });

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: updatedOrder,
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Admin/Super Admin: Get all pending restaurants for approval
export const getPendingRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const restaurants = await prisma.restaurant.findMany({
            where: { status: 'PENDING' },
            include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
        });

        res.status(200).json({ success: true, data: restaurants });
    } catch (error) {
        console.error('Get pending restaurants error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Admin/Super Admin: Approve or Reject Restaurant Status
export const updateRestaurantStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body; // PUBLISHED, REJECTED, UNPUBLISHED

        const restaurant = await prisma.restaurant.update({
            where: { id: id as string },
            data: { status },
        });

        res.status(200).json({
            success: true,
            message: `Restaurant status updated to ${status}`,
            data: restaurant,
        });
    } catch (error) {
        console.error('Update restaurant status error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};