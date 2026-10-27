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

        const {
            restaurantId,
            reservedFor,
            date,
            displayDate,
            time,
            mealPeriod,
            partySize,
            seatingArea,
            tableNumber,
            note,
            specialNotes,
        } = req.body;

        const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        // Format dates and times safely from reservedFor or direct inputs
        const targetDate = date || (reservedFor ? new Date(reservedFor).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const targetDisplayDate = displayDate || targetDate;
        const targetTime = time || (reservedFor ? new Date(reservedFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "7:00 PM");

        const reservation = await prisma.reservation.create({
            data: {
                userId: req.user.id,
                restaurantId,
                restaurantName: restaurant.name,
                restaurantImage: restaurant.coverUrl || null,
                neighborhood: restaurant.address || "Downtown",
                fullAddress: restaurant.address || "",
                cuisine: restaurant.cuisine || "Fine Dining",
                date: targetDate,
                displayDate: targetDisplayDate,
                time: targetTime,
                mealPeriod: mealPeriod || "Dinner",
                partySize: Number(partySize || 2),
                seatingArea: seatingArea || "Standard Seating",
                tableNumber: tableNumber ? String(tableNumber) : "1",
                specialNotes: specialNotes || note || null,
                status: 'CONFIRMED',
                statusDisplay: 'Confirmed',
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
            orderBy: { createdAt: 'desc' },
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
                rating: Number(rating),
                comment,
            },
        });

        // Recalculate restaurant average rating
        const reviews = await prisma.review.findMany({ where: { restaurantId } });
        const reviewCount = reviews.length;
        const avgRating = reviewCount > 0 ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount : 0;

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