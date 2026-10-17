// src/validations/restaurant.validation.ts
import { z } from 'zod';

export const createRestaurantSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Restaurant name is required'),
        description: z.string().optional(),
        cuisine: z.string().min(2, 'Cuisine type is required'),
        address: z.string().min(5, 'Address is required'),
        opensAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format must be HH:MM'),
        closesAt: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format must be HH:MM'),
        priceRange: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
        coverUrl: z.string().url().optional(),
    }),
});

export const updateRestaurantSchema = createRestaurantSchema.partial();