// src/controllers/order.controller.ts
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_dummy');

// Place a new order with atomic +20 loyalty points addition
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const {
            orderType,
            paymentMethod,
            deliveryAddress,
            deliveryLat,
            deliveryLng,
            couponCode,
            items: clientItems,
        } = req.body;

        let cartItems: Array<{
            menuItemId?: string;
            name: string;
            price: any;
            quantity: number;
            restaurantId?: string;
        }> = [];

        // 1. If items are sent directly from frontend cart, use them
        if (clientItems && clientItems.length > 0) {
            for (const item of clientItems) {
                const dbMenu = await prisma.menuItem
                    .findUnique({
                        where: { id: item.id || item.menuItemId },
                    })
                    .catch(() => null);

                cartItems.push({
                    menuItemId: dbMenu ? dbMenu.id : undefined,
                    name: item.name || dbMenu?.name || 'Menu Item',
                    price: dbMenu ? Number(dbMenu.price) : Number(item.price || 0),
                    quantity: Number(item.quantity || 1),
                    restaurantId: dbMenu?.restaurantId || item.restaurantId,
                });
            }
        } else {
            const dbCart = await prisma.cartItem.findMany({
                where: { userId: req.user.id },
                include: { menuItem: true },
            });

            cartItems = dbCart.map((ci) => ({
                menuItemId: ci.menuItemId,
                name: ci.menuItem.name,
                price: Number(ci.menuItem.price),
                quantity: ci.quantity,
                restaurantId: ci.menuItem.restaurantId,
            }));
        }

        if (cartItems.length === 0) {
            res.status(400).json({ success: false, message: 'Your cart is empty' });
            return;
        }

        // 2. Resolve restaurantId
        let restaurantId = cartItems.find((i) => i.restaurantId)?.restaurantId;
        if (!restaurantId) {
            const fallbackRestaurant = await prisma.restaurant.findFirst({ select: { id: true } });
            if (fallbackRestaurant) {
                restaurantId = fallbackRestaurant.id;
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Invalid cart item configuration: Restaurant not found',
                });
                return;
            }
        }

        // 3. Calculate subtotal
        let subtotal = 0;
        cartItems.forEach((item) => {
            subtotal += Number(item.price) * item.quantity;
        });

        // 4. Fetch platform settings for commission
        const platformSetting = await prisma.platformSetting.findUnique({ where: { id: 1 } });
        const commissionPercent = platformSetting ? Number(platformSetting.commissionPercent) : 10;
        const commissionAmount = (subtotal * commissionPercent) / 100;

        let discount = 0;
        let appliedCouponId = null;

        // 5. Handle Coupon if provided
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

        const deliveryFee = orderType === 'DELIVERY' ? 5.0 : 0.0;
        const total = subtotal - discount + deliveryFee;
        const pointsToAward = 20;

        // 6. STRIPE FLOW: Embedded PaymentIntent created without clearing cart until verified
        if (paymentMethod === 'STRIPE') {
            const draftOrder = await prisma.order.create({
                data: {
                    userId: req.user.id,
                    restaurantId,
                    orderType: orderType || 'DELIVERY',
                    paymentMethod: 'STRIPE',
                    paymentStatus: 'UNPAID',
                    status: 'PENDING',
                    subtotal,
                    discount,
                    deliveryFee,
                    total,
                    commissionAmount,
                    pointsEarned: pointsToAward,
                    couponId: appliedCouponId,
                    deliveryAddress: deliveryAddress || 'Standard Address',
                    deliveryLat,
                    deliveryLng,
                    items: {
                        create: cartItems.map((ci) => ({
                            menuItemId: ci.menuItemId,
                            name: ci.name,
                            price: ci.price,
                            quantity: ci.quantity,
                        })),
                    },
                },
                include: {
                    items: true,
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            coverUrl: true,
                            address: true,
                        },
                    },
                },
            });

            // Create Stripe PaymentIntent for embedded Stripe Payment Element
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.max(50, Math.round(total * 100)), // minimum $0.50 USD
                currency: 'usd',
                automatic_payment_methods: { enabled: true },
                metadata: {
                    orderId: draftOrder.id,
                    userId: req.user.id,
                    restaurantId,
                },
                description: `DineDesk Order #${draftOrder.id}`,
            });

            await prisma.order.update({
                where: { id: draftOrder.id },
                data: { stripeSessionId: paymentIntent.id },
            });

            res.status(201).json({
                success: true,
                message: 'Stripe PaymentIntent initialized',
                data: {
                    order: draftOrder,
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id,
                    total,
                    subtotal,
                    deliveryFee,
                    discount,
                },
            });
            return;
        }

        // 7. CASH ON DELIVERY (COD) FLOW: Immediately verified, clear cart, and award points
        const [order, updatedUser] = await prisma.$transaction([
            prisma.order.create({
                data: {
                    userId: req.user.id,
                    restaurantId,
                    orderType: orderType || 'DELIVERY',
                    paymentMethod: 'COD',
                    paymentStatus: 'UNPAID',
                    status: 'PENDING',
                    subtotal,
                    discount,
                    deliveryFee,
                    total,
                    commissionAmount,
                    pointsEarned: pointsToAward,
                    couponId: appliedCouponId,
                    deliveryAddress: deliveryAddress || 'Standard Address',
                    deliveryLat,
                    deliveryLng,
                    items: {
                        create: cartItems.map((ci) => ({
                            menuItemId: ci.menuItemId,
                            name: ci.name,
                            price: ci.price,
                            quantity: ci.quantity,
                        })),
                    },
                },
                include: {
                    items: true,
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            coverUrl: true,
                            address: true,
                        },
                    },
                },
            }),
            prisma.user.update({
                where: { id: req.user.id },
                data: {
                    loyaltyPoints: {
                        increment: pointsToAward,
                    },
                },
                select: { id: true, loyaltyPoints: true },
            }),
        ]);

        await prisma.cartItem.deleteMany({ where: { userId: req.user.id } }).catch(() => { });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: {
                order,
                loyaltyPoints: updatedUser.loyaltyPoints,
            },
        });
    } catch (error: any) {
        console.error('Create order error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Confirm Stripe Payment: Verifies Stripe session or PaymentIntent, marks PAID, awards loyalty points, and clears cart
export const confirmStripePayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, orderId, paymentIntentId } = req.body;

        if (!sessionId && !orderId && !paymentIntentId) {
            res.status(400).json({ success: false, message: 'PaymentIntent ID, Session ID, or Order ID is required' });
            return;
        }

        // 1. Locate the order by ID or stripeSessionId
        let order = await prisma.order.findFirst({
            where: {
                OR: [
                    orderId ? { id: String(orderId) } : undefined,
                    sessionId ? { stripeSessionId: String(sessionId) } : undefined,
                    paymentIntentId ? { stripeSessionId: String(paymentIntentId) } : undefined,
                ].filter(Boolean) as any,
            },
        });

        // 2. Resolve Stripe verification through PaymentIntent or Checkout Session
        const targetId = paymentIntentId || sessionId || order?.stripeSessionId;
        let isPaid = false;
        let retrievedPaymentIntent: Stripe.PaymentIntent | null = null;
        let stripeSession: Stripe.Checkout.Session | null = null;

        if (targetId) {
            if (String(targetId).startsWith('pi_')) {
                try {
                    retrievedPaymentIntent = await stripe.paymentIntents.retrieve(String(targetId));
                    isPaid = retrievedPaymentIntent.status === 'succeeded';
                } catch (piErr) {
                    console.error('Error retrieving stripe payment intent:', piErr);
                }
            } else {
                try {
                    stripeSession = await stripe.checkout.sessions.retrieve(String(targetId));
                    isPaid = stripeSession.payment_status === 'paid';
                } catch (stripeErr) {
                    console.error('Error retrieving stripe session:', stripeErr);
                }
            }
        }

        if (!order && (retrievedPaymentIntent?.metadata?.orderId || stripeSession?.metadata?.orderId)) {
            const metaOrderId = retrievedPaymentIntent?.metadata?.orderId || stripeSession?.metadata?.orderId;
            order = await prisma.order.findUnique({
                where: { id: String(metaOrderId) },
            });
        }

        if (!order) {
            res.status(404).json({ success: false, message: 'Order reference not found in database' });
            return;
        }

        // 3. Return early if already finalized
        if (order.paymentStatus === 'PAID') {
            res.status(200).json({
                success: true,
                message: 'Payment already confirmed',
                data: { order },
            });
            return;
        }

        if (!isPaid) {
            res.status(400).json({
                success: false,
                message: 'Payment has not been completed on Stripe yet',
            });
            return;
        }

        // 5. Atomic commit: Set order to PAID, award loyalty points, and clear database cart items
        const pointsAward = order.pointsEarned || 20;
        const resolvedStripeId = retrievedPaymentIntent?.id || stripeSession?.id || String(targetId);

        const [updatedOrder, updatedUser] = await prisma.$transaction([
            prisma.order.update({
                where: { id: order.id },
                data: {
                    paymentStatus: 'PAID',
                    status: 'PENDING',
                    stripeSessionId: resolvedStripeId,
                },
                include: {
                    items: true,
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            coverUrl: true,
                            address: true,
                        },
                    },
                },
            }),
            prisma.user.update({
                where: { id: order.userId },
                data: {
                    loyaltyPoints: { increment: pointsAward },
                },
                select: { id: true, loyaltyPoints: true },
            }),
        ]);

        // Record transaction idempotently
        const existingTx = await prisma.transaction.findFirst({
            where: { orderId: order.id, stripePaymentId: resolvedStripeId },
        });
        if (!existingTx) {
            await prisma.transaction.create({
                data: {
                    userId: order.userId,
                    orderId: order.id,
                    type: 'ORDER_PAYMENT',
                    method: 'STRIPE',
                    status: 'SUCCESS',
                    amount: Number(order.total),
                    stripePaymentId: resolvedStripeId,
                },
            }).catch(() => null);
        }

        await prisma.cartItem.deleteMany({ where: { userId: order.userId } }).catch(() => { });

        res.status(200).json({
            success: true,
            message: 'Payment successfully confirmed. Order sent to kitchen!',
            data: {
                order: updatedOrder,
                loyaltyPoints: updatedUser.loyaltyPoints,
            },
        });
    } catch (error: any) {
        console.error('Confirm stripe payment error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

// Get single order by ID
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const id = String(req.params.id);

        const order = await prisma.order.findFirst({
            where: {
                id,
                userId: req.user.id,
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        coverUrl: true,
                    },
                },
                items: {
                    include: {
                        menuItem: true,
                    },
                },
            },
        });

        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        console.error('Get order by ID error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get current user's orders
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const orders = await prisma.order.findMany({
            where: {
                userId: req.user.id,
            },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        coverUrl: true,
                        address: true,
                    },
                },
                items: {
                    include: {
                        menuItem: true,
                    },
                },
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

        if (order.status === 'CANCELLED') {
            res.status(400).json({
                success: false,
                message: 'This order is already cancelled.',
            });
            return;
        }

        if (order.status !== 'PENDING' && order.status !== 'ACCEPTED') {
            res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled because it is already being prepared or completed.',
            });
            return;
        }

        const pointsToDeduct = order.pointsEarned > 0 ? order.pointsEarned : 20;

        const currentUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { loyaltyPoints: true },
        });
        const currentPoints = currentUser?.loyaltyPoints || 0;
        const newLoyaltyPoints = Math.max(0, currentPoints - pointsToDeduct);

        const [updatedOrder, updatedUser] = await prisma.$transaction([
            prisma.order.update({
                where: { id },
                data: { status: 'CANCELLED' },
                include: {
                    items: true,
                    restaurant: {
                        select: {
                            id: true,
                            name: true,
                            coverUrl: true,
                            address: true,
                        },
                    },
                },
            }),
            prisma.user.update({
                where: { id: req.user.id },
                data: { loyaltyPoints: newLoyaltyPoints },
                select: { id: true, loyaltyPoints: true },
            }),
        ]);

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: updatedOrder,
            loyaltyPoints: updatedUser.loyaltyPoints,
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ==========================================
// VENDOR OPERATIONS CONTROLLERS
// ==========================================

// Get real-time metrics for Vendor Top Cards (Synchronized Analytics)
export const getVendorAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        // 1. Look up by ownerId, fallback to first available restaurant
        let restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
            select: { id: true, name: true, address: true },
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst({
                select: { id: true, name: true, address: true },
            });
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch all valid non-cancelled orders for volume and metrics
        const validOrders = await prisma.order.findMany({
            where: {
                restaurantId: restaurant.id,
                status: { notIn: ['CANCELLED', 'REJECTED'] as any },
            },
            select: { total: true, paymentStatus: true, createdAt: true, status: true },
        });

        // 1. Revenue
        const todayOrders = validOrders.filter(
            (o) => new Date(o.createdAt) >= startOfToday
        );

        let todayRevenue = todayOrders.reduce(
            (acc, curr) => acc + Number(curr.total || 0),
            0
        );

        if (todayRevenue === 0 && validOrders.length > 0) {
            todayRevenue = validOrders.reduce(
                (acc, curr) => acc + Number(curr.total || 0),
                0
            );
        }

        // 2. Kitchen Active Queue (PENDING, ACCEPTED, PREPARING)
        const activePrepCount = validOrders.filter(
            (o) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(o.status)
        ).length;

        // 3. In Transit Orders
        const inTransitCount = validOrders.filter(
            (o) => o.status === 'OUT_FOR_DELIVERY'
        ).length;

        // 4. Fulfilled / Delivered Orders
        const fulfilledCount = validOrders.filter(
            (o) => o.status === 'DELIVERED'
        ).length;

        // 5. Total Orders in Database
        const totalOrdersCount = await prisma.order.count({
            where: {
                restaurantId: restaurant.id,
            },
        });

        // 6. Menu Offerings Breakdown
        const totalMenuItems = await prisma.menuItem.count({
            where: { restaurantId: restaurant.id },
        });
        const activeMenuItems = await prisma.menuItem.count({
            where: { restaurantId: restaurant.id, isAvailable: true, isPublished: true },
        });

        // 7. Confirmed Holds Count
        const totalReservations = await prisma.reservation.count({
            where: {
                restaurantId: restaurant.id,
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
        });

        res.status(200).json({
            success: true,
            data: {
                restaurantName: restaurant.name,
                metrics: {
                    todayRevenue,
                    activePrepCount,
                    inTransitCount,
                    fulfilledCount,
                    totalOrdersCount,
                    totalMenuItems,
                    activeMenuItems: activeMenuItems || totalMenuItems,
                    todayReservations: totalReservations,
                    estimatedOccupancy: `${Math.min(totalReservations, 24)}/24`,
                },
            },
        });
    } catch (error: any) {
        console.error('Get vendor analytics error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Get Live Orders Queue for Kitchen Console (All orders)
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        let restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
            select: { id: true },
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst({
                select: { id: true },
            });
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        const orders = await prisma.order.findMany({
            where: {
                restaurantId: restaurant.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        avatarUrl: true,
                    },
                },
                items: {
                    include: {
                        menuItem: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Update Order Status by Vendor
export const updateOrderStatusByVendor = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { status } = req.body;

        let restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
            select: { id: true },
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst({
                select: { id: true },
            });
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        const order = await prisma.order.findFirst({
            where: { id: String(id), restaurantId: restaurant.id },
        });

        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found under your restaurant' });
            return;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: String(id) },
            data: { status },
            include: {
                items: true,
                user: { select: { id: true, name: true, phone: true } },
            },
        });

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: updatedOrder,
        });
    } catch (error: any) {
        console.error('Update vendor order status error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};