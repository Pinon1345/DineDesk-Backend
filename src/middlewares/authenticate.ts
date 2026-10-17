import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: 'USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN';
            };
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        let token = req.cookies?.token;

        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
            return;
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            id: string;
            email: string;
            role: 'USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN';
        };

        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid or expired token.' });
        return;
    }
};