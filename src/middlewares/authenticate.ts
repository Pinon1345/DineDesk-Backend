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

        // 2. Try Standard JWT Verification First
        if (!token.startsWith('better_auth_')) {
            try {
                const decoded = jwt.verify(token, env.JWT_SECRET) as {
                    id?: string;
                    userId?: string;
                    email: string;
                    role?: 'USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN';
                    name?: string;
                };

                const userId = decoded.id || decoded.userId;
                if (userId) {
                    req.user = {
                        id: userId,
                        email: decoded.email,
                        role: decoded.role || 'USER',
                        name: decoded.name,
                    };
                    return next();
                }
            } catch (jwtErr) {
                // Not a valid JWT or expired; continue to fallback lookup
            }
        }

        // 3. Fallback for Better-Auth Session Verification
        const rawToken = token.replace(/^better_auth_/, '').trim();
        const userEmailHeader = (req.headers['x-user-email'] as string)?.trim()?.toLowerCase();

        // Check if rawToken exists in a postgres session table if present
        if (rawToken) {
            try {
                const sessions = await prisma.$queryRawUnsafe<any[]>(
                    `SELECT "userId", "expiresAt" FROM "session" WHERE "token" = $1 OR "id" = $1 LIMIT 1`,
                    rawToken
                );
                if (sessions && sessions.length > 0) {
                    const sess = sessions[0];
                    if (!sess.expiresAt || new Date(sess.expiresAt) >= new Date()) {
                        const sessUser = await prisma.user.findUnique({
                            where: { id: sess.userId },
                        });
                        if (sessUser && !sessUser.isBanned) {
                            req.user = {
                                id: sessUser.id,
                                email: sessUser.email,
                                role: sessUser.role,
                                name: sessUser.name,
                            };
                            return next();
                        }
                    }
                }
            } catch (sessionErr) {
                // No session table or query failed; fall through to user lookup
            }

            // Direct User lookup by User ID, Google ID, or email header
            try {
                const conditions: any[] = [{ id: rawToken }, { googleId: rawToken }];
                if (userEmailHeader) {
                    conditions.push({ email: userEmailHeader });
                }

                const matchedUser = await prisma.user.findFirst({
                    where: {
                        OR: conditions,
                    },
                });

                if (matchedUser) {
                    if (matchedUser.isBanned) {
                        res.status(403).json({ success: false, message: 'Your account has been suspended' });
                        return;
                    }

                    req.user = {
                        id: matchedUser.id,
                        email: matchedUser.email,
                        role: matchedUser.role,
                        name: matchedUser.name,
                    };
                    return next();
                }
            } catch (dbErr) {
                console.error('User lookup fallback error:', dbErr);
            }
        }

        // If email header was passed alone
        if (userEmailHeader) {
            try {
                const matchedUser = await prisma.user.findUnique({
                    where: { email: userEmailHeader },
                });
                if (matchedUser && !matchedUser.isBanned) {
                    req.user = {
                        id: matchedUser.id,
                        email: matchedUser.email,
                        role: matchedUser.role,
                        name: matchedUser.name,
                    };
                    return next();
                }
            } catch (dbErr) {
                console.error('User email lookup fallback error:', dbErr);
            }
        }

        res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        return;
    } catch (error: any) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ success: false, message: 'Internal server authentication error' });
        return;
    }
};
