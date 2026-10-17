// src/validations/social.validation.ts
import { z } from 'zod';

export const createReservationSchema = z.object({
    body: z.object({
        restaurantId: z.string().min(1, 'Restaurant ID is required'),
        reservedFor: z.string().refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format for reservation',
        }),
        partySize: z.number().int().positive('Party size must be at least 1'),
        note: z.string().optional(),
    }),
});

export const createReviewSchema = z.object({
    body: z.object({
        restaurantId: z.string().min(1, 'Restaurant ID is required'),
        rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
        comment: z.string().min(2, 'Comment is required'),
    }),
});