// src/validations/auth.validation.ts
import { z } from 'zod';

export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, 'Name must be at least 2 characters'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        phone: z.string().optional(),
        role: z.enum(['USER', 'VENDOR']).default('USER'),
    }),
});

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(1, 'Password is required'),
        rememberMe: z.boolean().optional().default(false),
    }),
});

export const updateUserProfileSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name cannot be empty').optional(),
        fullName: z.string().min(1, 'Name cannot be empty').optional(),
        email: z.string().email('Invalid email address').optional(),
        phone: z.string().nullable().optional(),
        avatarUrl: z.string().nullable().optional(),
        image: z.string().nullable().optional(),
        language: z.string().optional(),
        dietaryPreferences: z.array(z.string()).optional(),
    }),
});