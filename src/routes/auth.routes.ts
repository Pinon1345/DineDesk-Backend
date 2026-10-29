// src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';
import { getMe, googleLogin, login, logout, register } from '../controllers/auth.controller.js';
import { sendSignInEmail, sendWelcomeEmail } from '../services/email.service.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', googleLogin);
router.post('/social-login', googleLogin);
router.post('/oauth-callback', googleLogin);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Endpoint called by frontend google-sync for first-time Google sign-up / welcome email
router.post('/send-welcome-email', async (req: Request, res: Response) => {
    try {
        const { email, toEmail, name, userName, firstName } = req.body;
        const recipientEmail = toEmail || email;

        if (!recipientEmail) {
            return res.status(400).json({
                success: false,
                message: 'Recipient email is required',
            });
        }

        await sendWelcomeEmail({
            toEmail: recipientEmail,
            userName: userName || name || firstName || 'Diner',
        });

        return res.status(200).json({
            success: true,
            message: 'Welcome email sent successfully',
        });
    } catch (error: any) {
        console.error('Welcome email endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: error?.message || 'Failed to dispatch welcome email',
        });
    }
});

// Endpoint called by frontend google-sync to trigger the sign-in notification email
router.post('/send-signin-email', async (req: Request, res: Response) => {
    try {
        const { toEmail, email, firstName, name, userName, loginDate, loginTime, device, ipAddress, userAgent } = req.body;
        const recipientEmail = toEmail || email;

        if (!recipientEmail) {
            return res.status(400).json({
                success: false,
                message: 'Recipient email is required',
            });
        }

        await sendSignInEmail({
            toEmail: recipientEmail,
            userName: userName || name || firstName || 'Diner',
            firstName: firstName || name || userName || 'Diner',
            loginDate: loginDate || new Date().toLocaleDateString('en-US'),
            loginTime: loginTime || new Date().toLocaleTimeString('en-US'),
            device: device || 'Google Account (Web)',
            ipAddress,
            userAgent,
        });

        return res.status(200).json({
            success: true,
            message: 'Sign-in notification email sent successfully',
        });
    } catch (error: any) {
        console.error('Sign-in email endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: error?.message || 'Failed to dispatch sign-in email',
        });
    }
});

export default router;