// src/controllers/social.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// Create Table Reservation
export const createReservation = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { restaurantId, reservedFor, partySize, note } = req.body;

        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        const reservation = await prisma.reservation.create({
            data: {
                userId: req.user.id,
                restaurantId,
                reservedFor: new Date(reservedFor),
                partySize,
                note,
                status: 'PENDING',
            },
        });

        res.status(201).json({
            success: true,
            message: 'Reservation request submitted successfully',
            data: reservation,
        });
    } catch (error) {
        console.error('Create reservation error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get User Reservations
export const getMyReservations = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const reservations = await prisma.reservation.findMany({
            where: { userId: req.user.id },
            include: { restaurant: { select: { id: true, name: true, address: true, coverUrl: true } } },
            orderBy: { reservedFor: 'desc' },
        });

        res.status(200).json({ success: true, data: reservations });
    } catch (error) {
        console.error('Get reservations error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Create Review & Update Restaurant Average Rating
export const createReview = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { restaurantId, rating, comment } = req.body;

        // Check if user already reviewed this restaurant
        const existingReview = await prisma.review.findUnique({
            where: {
                userId_restaurantId: {
                    userId: req.user.id,
                    restaurantId,
                },
            },
        });

        if (existingReview) {
            res.status(400).json({ success: false, message: 'You have already reviewed this restaurant' });
            return;
        }

        const review = await prisma.review.create({
            data: {
                userId: req.user.id,
                restaurantId,
                rating,
                comment,
            },
        });

        // Recalculate restaurant average rating
        const reviews = await prisma.review.findMany({ where: { restaurantId } });
        const reviewCount = reviews.length;
        const avgRating = reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount;

        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: { avgRating, reviewCount },
        });

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: review,
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};