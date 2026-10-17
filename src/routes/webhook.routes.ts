// src/routes/webhook.routes.ts
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2025-02-28.acacia' as any,
});

router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
        // Note: In production, use express.raw({ type: 'application/json' }) for this route
        event = stripe.webhooks.constructEvent(req.body, sig as string, env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy');
    } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
            await prisma.order.update({
                where: { id: orderId },
                data: { paymentStatus: 'PAID' },
            });

            // Record transaction
            await prisma.transaction.create({
                data: {
                    userId: session.client_reference_id || 'system',
                    orderId,
                    type: 'ORDER_PAYMENT',
                    method: 'STRIPE',
                    status: 'SUCCESS',
                    amount: session.amount_total ? session.amount_total / 100 : 0,
                    stripePaymentId: session.payment_intent as string,
                },
            });

            console.log(`✅ Order ${orderId} marked as PAID via Stripe webhook.`);
        }
    }

    res.status(200).json({ received: true });
});

export default router;