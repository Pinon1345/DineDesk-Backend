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
        const payload = (req as any).rawBody || req.body;
        event = stripe.webhooks.constructEvent(payload, sig as string, env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy');
    } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    try {
        // 1. Handle Embedded Stripe PaymentIntent Succeeded
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = paymentIntent.metadata?.orderId;
            const userId = paymentIntent.metadata?.userId;

            if (orderId) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        paymentStatus: 'PAID',
                        status: 'PENDING',
                        stripeSessionId: paymentIntent.id,
                    },
                });

                // Idempotently create transaction record
                const existingTx = await prisma.transaction.findFirst({
                    where: { orderId, stripePaymentId: paymentIntent.id },
                });
                if (!existingTx) {
                    await prisma.transaction.create({
                        data: {
                            userId: userId || 'system',
                            orderId,
                            type: 'ORDER_PAYMENT',
                            method: 'STRIPE',
                            status: 'SUCCESS',
                            amount: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : paymentIntent.amount / 100,
                            stripePaymentId: paymentIntent.id,
                        },
                    });
                }

                // Award 20 loyalty points & clean user DB cart
                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { loyaltyPoints: { increment: 20 } },
                    }).catch(() => null);
                    await prisma.cartItem.deleteMany({
                        where: { userId },
                    }).catch(() => null);
                }

                console.log(`✅ Order ${orderId} confirmed as PAID via payment_intent.succeeded.`);
            }
        }

        // 2. Handle PaymentIntent Payment Failed
        else if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = paymentIntent.metadata?.orderId;

            if (orderId) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: { paymentStatus: 'FAILED' },
                }).catch(() => null);

                console.warn(`⚠️ Order ${orderId} marked as FAILED via payment_intent.payment_failed.`);
            }
        }

        // 3. Handle PaymentIntent Processing
        else if (event.type === 'payment_intent.processing') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = paymentIntent.metadata?.orderId;

            if (orderId) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: { paymentStatus: 'UNPAID' },
                }).catch(() => null);
            }
        }

        // 4. Handle Legacy Checkout Session Completed
        else if (event.type === 'checkout.session.completed') {
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

                console.log(`✅ Order ${orderId} marked as PAID via Stripe checkout.session.completed webhook.`);
            }
        }
    } catch (dbErr: any) {
        console.error('Webhook database update error:', dbErr);
    }

    res.status(200).json({ received: true });
});

export default router;