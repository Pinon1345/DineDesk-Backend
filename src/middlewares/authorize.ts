import { Request, Response, NextFunction } from 'express';

export const authorize = (...allowedRoles: ('USER' | 'VENDOR' | 'ADMIN' | 'SUPERADMIN')[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Access forbidden. You do not have the required permissions.',
            });
            return;
        }

        next();
    };
};