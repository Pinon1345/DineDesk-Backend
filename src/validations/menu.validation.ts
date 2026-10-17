// src/validations/menu.validation.ts
import { z } from 'zod';

export const createMenuItemSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Item name is required'),
        description: z.string().optional(),
        price: z.number().positive('Price must be greater than 0'),
        category: z.string().min(2, 'Category is required (e.g., Starters, Mains, Desserts)'),
        imageUrl: z.string().url().optional(),
        isAvailable: z.boolean().optional().default(true),
    }),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();