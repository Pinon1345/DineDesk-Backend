// src/controllers/restaurant.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// Get all published restaurants (Public)
export const getRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cuisine, search, page = '1', limit = '10' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = { status: 'PUBLISHED' };

        if (cuisine) {
            where.cuisine = { contains: cuisine as string, mode: 'insensitive' };
        }

        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { cuisine: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [restaurants, total] = await Promise.all([
            prisma.restaurant.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                orderBy: { avgRating: 'desc' },
            }),
            prisma.restaurant.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            data: restaurants,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    } catch (error) {
        console.error('Get restaurants error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get single restaurant by ID with its menu items (Public)
export const getRestaurantById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: id as string },
            include: {
                menuItems: {
                    where: { isPublished: true },
                },
                reviews: {
                    include: {
                        user: { select: { id: true, name: true, avatarUrl: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Create restaurant profile (Vendor only)
export const createRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // Check if vendor already has a restaurant
        const existingRestaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
        });

        if (existingRestaurant) {
            res.status(400).json({ success: false, message: 'Vendor can only own one restaurant' });
            return;
        }

        const restaurant = await prisma.restaurant.create({
            data: {
                ownerId: req.user.id,
                ...req.body,
                status: 'PENDING', // Requires admin approval / listing fee
            },
        });

        res.status(201).json({
            success: true,
            message: 'Restaurant profile created successfully and is pending review',
            data: restaurant,
        });
    } catch (error) {
        console.error('Create restaurant error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get logged-in vendor's own restaurant
export const getMyRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
            include: { menuItems: true },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant profile not found' });
            return;
        }

        res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        console.error('Get my restaurant error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};