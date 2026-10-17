// src/validations/cart.validation.ts
import { z } from 'zod';

export const addToCartSchema = z.object({
    body: z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        quantity: z.number().int().positive('Quantity must be at least 1').default(1),
    }),
});

export const updateCartItemSchema = z.object({
    body: z.object({
        quantity: z.number().int().positive('Quantity must be at least 1'),
    }),
});