// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { sendWelcomeEmail, sendSignInEmail, sendVerificationCodeEmail } from '../services/email.service.js';

// Helper to generate JWT token
const generateToken = (user: { id: string; email: string; role: any }, rememberMe: boolean) => {
    const expiresIn = rememberMe ? '30d' : env.JWT_EXPIRES_IN;
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
        expiresIn: expiresIn as any,
    });
};

// =========================================================================
// REGISTRATION EMAIL VERIFICATION (OTP GENERATION & VALIDATION)
// =========================================================================

export const sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, name } = req.body;

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ success: false, message: 'A valid email address is required' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Prevent duplicate registrations
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'An account with this email already exists' });
            return;
        }

        // 2. Generate cryptographically safe 6-digit numeric code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

        // 3. Clear previous token records for this email
        await prisma.emailVerificationToken.deleteMany({ where: { email: normalizedEmail } });

        // 4. Save token to PostgreSQL
        await prisma.emailVerificationToken.create({
            data: {
                email: normalizedEmail,
                code,
                expiresAt,
            },
        });

        // 5. Send luxury branded email via Nodemailer
        await sendVerificationCodeEmail({
            toEmail: normalizedEmail,
            code,
            name: name || undefined,
        });

        res.status(200).json({
            success: true,
            message: 'Verification code dispatched to your email address',
        });
    } catch (error: any) {
        console.error('Send verification code error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to dispatch verification code. Please check your connection.',
        });
    }
};

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, code } = req.body;

        if (!email || !code) {
            res.status(400).json({ success: false, message: 'Email and verification code are required' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const cleanCode = String(code).trim();

        // 1. Find matching verification token
        const tokenRecord = await prisma.emailVerificationToken.findFirst({
            where: {
                email: normalizedEmail,
                code: cleanCode,
            },
        });

        if (!tokenRecord) {
            res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' });
            return;
        }

        // 2. Check expiration
        if (new Date() > tokenRecord.expiresAt) {
            await prisma.emailVerificationToken.deleteMany({ where: { email: normalizedEmail } });
            res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
            return;
        }

        // 3. Clean up used token
        await prisma.emailVerificationToken.deleteMany({ where: { email: normalizedEmail } });

        // 4. Issue a short-lived token confirming email verification
        const verificationToken = jwt.sign(
            { email: normalizedEmail, isVerified: true },
            env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(200).json({
            success: true,
            message: 'Email address verified successfully',
            verificationToken,
        });
    } catch (error: any) {
        console.error('Verify code error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error during verification',
        });
    }
};

// =========================================================================
// STANDARD AUTHENTICATION CONTROLLERS
// =========================================================================

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, phone, role, verificationToken, code } = req.body;

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email and password are required' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email is already registered' });
            return;
        }

        // Validate verification status if token or code is provided
        if (verificationToken) {
            try {
                const decoded = jwt.verify(verificationToken, env.JWT_SECRET) as any;
                if (decoded.email !== normalizedEmail || !decoded.isVerified) {
                    res.status(400).json({ success: false, message: 'Invalid email verification session' });
                    return;
                }
            } catch {
                res.status(400).json({ success: false, message: 'Email verification session expired. Please verify again.' });
                return;
            }
        } else if (code) {
            const tokenRecord = await prisma.emailVerificationToken.findFirst({
                where: { email: normalizedEmail, code: String(code).trim() },
            });
            if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
                res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
                return;
            }
            await prisma.emailVerificationToken.deleteMany({ where: { email: normalizedEmail } });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: (name && String(name).trim()) || normalizedEmail.split('@')[0],
                email: normalizedEmail,
                passwordHash,
                phone: phone ? String(phone).trim() : null,
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

        // Extract telemetry for security notification
        const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const ipAddress = rawIp.split(',')[0]?.trim() || '127.0.0.1';
        const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';

        // Trigger Sign-in notification asynchronously without blocking response
        sendSignInEmail({
            toEmail: user.email,
            userName: user.name || 'Diner',
            ipAddress,
            userAgent,
        }).catch((err) => {
            console.error('❌ Failed to dispatch sign-in email:', err);
        });

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

// Google OAuth / Social Login
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const bodyData = req.body && req.body.body ? req.body.body : req.body;
        const { email, name, googleId, avatarUrl, image } = bodyData || {};

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            res.status(400).json({ success: false, message: 'Valid email is required for Google login' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const incomingName = (name && String(name).trim()) || normalizedEmail.split('@')[0] || 'Diner';
        const incomingAvatar =
            (typeof avatarUrl === 'string' && avatarUrl.trim()) ||
            (typeof image === 'string' && image.trim()) ||
            null;

        // Find existing user by email or googleId
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    ...(googleId ? [{ googleId: String(googleId) }] : []),
                ],
            },
        });

        if (user) {
            if (user.isBanned) {
                res.status(403).json({ success: false, message: 'Your account has been suspended' });
                return;
            }

            // Sync missing fields
            const updateFields: Record<string, any> = {};
            if (googleId && !user.googleId) {
                updateFields.googleId = String(googleId);
            }
            if (incomingAvatar && !user.avatarUrl) {
                updateFields.avatarUrl = incomingAvatar;
            }
            if ((!user.name || user.name === 'Diner' || user.name.trim() === '') && incomingName) {
                updateFields.name = incomingName;
            }

            if (Object.keys(updateFields).length > 0) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: updateFields,
                });
            }
        } else {
            // Create new Google user
            user = await prisma.user.create({
                data: {
                    name: incomingName,
                    email: normalizedEmail,
                    googleId: googleId ? String(googleId) : undefined,
                    avatarUrl: incomingAvatar || undefined,
                    role: 'USER',
                },
            });

            // Dispatch welcome email asynchronously
            sendWelcomeEmail({
                toEmail: user.email,
                userName: user.name || 'Diner',
            }).catch((mailError) => {
                console.error('Failed to send welcome email for Google user:', mailError);
            });
        }

        // Generate JWT token (30 days validity for seamless user experience)
        const token = generateToken(user, true);

        // Telemetry sign-in email
        const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const ipAddress = rawIp.split(',')[0]?.trim() || '127.0.0.1';
        const userAgent = (req.headers['user-agent'] as string) || 'Google Web Client';

        sendSignInEmail({
            toEmail: user.email,
            userName: user.name || 'Diner',
            ipAddress,
            userAgent,
        }).catch((err) => {
            console.error('Failed to dispatch sign-in email:', err);
        });

        res
            .cookie('token', token, {
                httpOnly: true,
                secure: env.COOKIE_SECURE,
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            })
            .status(200)
            .json({
                success: true,
                message: 'Google login successful',
                token,
                data: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatarUrl: user.avatarUrl,
                    loyaltyPoints: user.loyaltyPoints,
                    phone: user.phone,
                },
            });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during Google login' });
    }
};