import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: 'USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN';
                name?: string;
            };
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // 1. Extract token from headers and cookies
        let token =
            req.cookies?.token ||
            req.cookies?.['better-auth.session_token'] ||
            req.cookies?.dinedesk_auth_token ||
            (req.headers['x-session-token'] as string) ||
            (req.headers['better-auth-session-token'] as string);

        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token || token.trim() === '') {
            res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
            return;
        }

        token = token.trim();

        // 2. Normalize token for Better-Auth Session verification
        const rawToken = token.replace(/^better_auth_/, '');

        try {
            // Check session table against both raw token, prefixed token, and session ID
            const session = await (prisma as any).session.findFirst({
                where: {
                    OR: [
                        { token: rawToken },
                        { token: token },
                        { id: rawToken },
                        { id: token }
                    ]
                },
                include: { user: true },
            });

            if (session && session.user) {
                // Verify expiration if set
                if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
                    res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
                    return;
                }

                req.user = {
                    id: session.user.id,
                    email: session.user.email,
                    role: (session.user.role as 'USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN') || 'USER',
                    name: session.user.name,
                };
                return next();
            }
        } catch (dbErr) {
            console.error('Session lookup failed, attempting JWT fallback:', dbErr);
        }

        // 3. Fallback: Verify as standard JWT
        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as {
                id?: string;
                userId?: string;
                email: string;
                role?: 'USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN';
                name?: string;
            };

            const userId = decoded.id || decoded.userId;
            if (!userId) {
                res.status(401).json({ success: false, message: 'Invalid token payload.' });
                return;
            }

            req.user = {
                id: userId,
                email: decoded.email,
                role: decoded.role || 'USER',
                name: decoded.name,
            };
            return next();
        } catch (jwtErr) {
            res.status(401).json({ success: false, message: 'Invalid or expired token.' });
            return;
        }
    } catch (error: any) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ success: false, message: 'Internal server authentication error' });
        return;
    }
};