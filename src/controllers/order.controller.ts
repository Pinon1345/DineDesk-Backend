// src/controllers/order.controller.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2025-02-28.acacia' as any,
});

// Place a new order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { orderType, paymentMethod, deliveryAddress, deliveryLat, deliveryLng, couponCode } = req.body;

        // 1. Fetch user's cart items
        const cartItems = await prisma.cartItem.findMany({
            where: { userId: req.user.id },
            include: { menuItem: true },
        });

        if (cartItems.length === 0) {
            res.status(400).json({ success: false, message: 'Your cart is empty' });
            return;
        }

        const restaurantId = cartItems[0]?.menuItem?.restaurantId;

        if (!restaurantId) {
            res.status(400).json({ success: false, message: 'Invalid cart item configuration' });
            return;
        }

        // 2. Calculate subtotal
        let subtotal = 0;
        cartItems.forEach((item) => {
            subtotal += Number(item.menuItem.price) * item.quantity;
        });

        // 3. Fetch platform settings for commission
        const platformSetting = await prisma.platformSetting.findUnique({ where: { id: 1 } });
        const commissionPercent = platformSetting ? Number(platformSetting.commissionPercent) : 10;
        const commissionAmount = (subtotal * commissionPercent) / 100;

        let discount = 0;
        let appliedCouponId = null;

        // 4. Handle Coupon if provided
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
            if (coupon && coupon.isActive && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
                if (subtotal >= Number(coupon.minOrder)) {
                    if (coupon.discountType === 'PERCENT') {
                        discount = (subtotal * Number(coupon.value)) / 100;
                        if (coupon.maxDiscount && discount > Number(coupon.maxDiscount)) {
                            discount = Number(coupon.maxDiscount);
                        }
                    } else {
                        discount = Number(coupon.value);
                    }
                    appliedCouponId = coupon.id;
                }
            }
        }

        const deliveryFee = orderType === 'DELIVERY' ? 5.00 : 0.00;
        const total = subtotal - discount + deliveryFee;

        // 5. Create Order in Database
        const order = await prisma.order.create({
            data: {
                userId: req.user.id,
                restaurantId,
                orderType,
                paymentMethod,
                paymentStatus: 'UNPAID',
                subtotal,
                discount,
                deliveryFee,
                total,
                commissionAmount,
                couponId: appliedCouponId,
                deliveryAddress,
                deliveryLat,
                deliveryLng,
                items: {
                    create: cartItems.map((ci) => ({
                        menuItemId: ci.menuItemId,
                        name: ci.menuItem.name,
                        price: ci.menuItem.price,
                        quantity: ci.quantity,
                    })),
                },
            },
            include: { items: true },
        });

        // 6. Clear User Cart
        await prisma.cartItem.deleteMany({ where: { userId: req.user.id } });

        // 7. If Stripe, create Stripe Checkout Session
        let stripeSessionUrl = null;
        if (paymentMethod === 'STRIPE') {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: order.items.map((item) => ({
                    price_data: {
                        currency: 'usd',
                        product_data: { name: item.name },
                        unit_amount: Math.round(Number(item.price) * 100),
                    },
                    quantity: item.quantity,
                })),
                mode: 'payment',
                success_url: `${env.FRONTEND_URL}/orders/success?order_id=${order.id}`,
                cancel_url: `${env.FRONTEND_URL}/orders/cancel?order_id=${order.id}`,
                metadata: { orderId: order.id },
            } as any);

            await prisma.order.update({
                where: { id: order.id },
                data: { stripeSessionId: session.id },
            });

            stripeSessionUrl = session.url;
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                order,
                stripeSessionUrl,
            },
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get user orders
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const orders = await prisma.order.findMany({
            where: { userId: req.user.id },
            include: {
                restaurant: { select: { id: true, name: true, coverUrl: true } },
                items: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Cancel a user order
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const id = String(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order || order.userId !== req.user.id) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        // Only allow cancellation if order is still PENDING or ACCEPTED
        if (order.status !== 'PENDING' && order.status !== 'ACCEPTED') {
            res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled because it is already being prepared or completed.'
            });
            return;
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: { items: true, restaurant: { select: { id: true, name: true, coverUrl: true } } },
        });

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: updatedOrder,
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};