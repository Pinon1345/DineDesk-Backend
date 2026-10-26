// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { sendWelcomeEmail } from '../services/email.service.js';

// Helper to generate JWT token
const generateToken = (user: { id: string; email: string; role: any }, rememberMe: boolean) => {
    const expiresIn = rememberMe ? '30d' : env.JWT_EXPIRES_IN;
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
        expiresIn: expiresIn as any,
    });
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, role } = req.body;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email is already registered' });
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                phone,
                role: role || 'USER',
            },
        });

        // Trigger Welcome Email and log execution status directly
        try {
            await sendWelcomeEmail({
                toEmail: user.email,
                userName: user.name || 'Diner',
            });
        } catch (mailError) {
            console.error('❌ Failed to dispatch welcome email during registration:', mailError);
        }

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, rememberMe } = req.body;

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }

        // Check if user is banned
        if (user.isBanned) {
            res.status(403).json({ success: false, message: 'Your account has been suspended' });
            return;
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
        }

        // Generate token
        const token = generateToken(user, rememberMe);

        // Set cookie options
        const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

        res
            .cookie('token', token, {
                httpOnly: true,
                secure: env.COOKIE_SECURE,
                sameSite: 'strict',
                maxAge: cookieMaxAge,
            })
            .status(200).json({
                success: true,
                message: 'Login successful',
                token,
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                },
            });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie('token').status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                avatarUrl: true,
                loyaltyPoints: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};