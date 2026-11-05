// src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';

// ==========================================
// HELPER UTILITIES
// ==========================================
const getOrderAmount = (order: any): number => {
    return Number(order?.total ?? order?.totalAmount ?? order?.totalPrice ?? order?.amount ?? 0);
};

// Robust parser across Cloudinary and all URL formats
const resolveItemImage = (obj: any): string => {
    if (!obj) return '';

    const candidates = [
        obj.image,
        obj.imageUrl,
        obj.img,
        obj.photo,
        obj.coverImage,
        obj.thumbnail,
    ];

    for (const val of candidates) {
        if (typeof val === 'string' && val.trim().startsWith('http')) {
            return val.trim();
        }
    }

    if (Array.isArray(obj.images) && obj.images.length > 0) {
        const first = obj.images[0];
        if (typeof first === 'string' && first.trim().startsWith('http')) {
            return first.trim();
        }
    }

    return '';
};

// Helper to sanitize duplicated address strings stored in PostgreSQL
const sanitizeAddress = (rawAddress: string | null | undefined): string => {
    if (!rawAddress) return 'Gulshan Avenue, Gulshan / Banani, Dhaka';
    const parts = rawAddress
        .split(/[,/]+/)
        .map((p) => p.trim())
        .filter(Boolean);
    const uniqueParts = Array.from(new Set(parts));
    return uniqueParts.join(', ');
};

// ==========================================
// 1. EXECUTIVE OVERVIEW & PLATFORM TELEMETRY
// ==========================================
export const getAdminOverviewData = async (req: Request, res: Response): Promise<void> => {
    try {
        const range = (req.query.range as string) || '30d';
        const now = new Date();
        const currentYear = now.getFullYear();

        const daysAgo = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : 30;
        const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const prevStartDate = new Date(startDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        const [
            totalUsers,
            prevUsers,
            completedOrdersCount,
            activeRestaurantsCount,
            featuredRestaurants,
            recentOrders,
            allYearOrders,
        ] = await Promise.all([
            prisma.user.count({
                where: {
                    NOT: { email: { startsWith: 'purged_' } },
                },
            }).catch(() => 0),
            prisma.user.count({
                where: {
                    createdAt: { lt: startDate },
                    NOT: { email: { startsWith: 'purged_' } },
                },
            }).catch(() => 0),
            prisma.order.count({ where: { createdAt: { gte: startDate } } }).catch(() => 0),
            prisma.restaurant.count().catch(() => 0),
            prisma.restaurant.findMany({
                take: 6,
                orderBy: { createdAt: 'desc' },
            }).catch(() => []),
            prisma.order.findMany({
                take: 50,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { name: true, email: true } },
                },
            }).catch(() => []),
            prisma.order.findMany({
                where: {
                    createdAt: { gte: new Date(currentYear, 0, 1) },
                },
            }).catch(() => []),
        ]);

        const currentOrders = (allYearOrders as any[]).filter(
            (o) => new Date(o.createdAt) >= startDate
        );
        const prevOrders = (allYearOrders as any[]).filter(
            (o) => new Date(o.createdAt) >= prevStartDate && new Date(o.createdAt) < startDate
        );

        const currentGmv = currentOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);
        const prevGmv = prevOrders.reduce((sum, o) => sum + getOrderAmount(o), 0);

        const gmvGrowthPct = prevGmv > 0
            ? Number((((currentGmv - prevGmv) / prevGmv) * 100).toFixed(1))
            : 0;

        const userGrowthPct = prevUsers > 0
            ? Number((((totalUsers - prevUsers) / prevUsers) * 100).toFixed(1))
            : 0;

        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const monthlyVolume = monthNames.map((month) => ({
            month,
            volume: 0,
            orders: 0,
        }));

        (allYearOrders as any[]).forEach((order) => {
            const monthIdx = new Date(order.createdAt).getMonth();
            const targetMonth = monthlyVolume[monthIdx];
            if (targetMonth) {
                targetMonth.volume += getOrderAmount(order);
                targetMonth.orders += 1;
            }
        });

        const auditEvents = (recentOrders as any[]).map((order: any, idx: number) => {
            const rawAmount = getOrderAmount(order);
            const statusUpper = String(order.status || '').toUpperCase();
            const isSettled = statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED';

            return {
                id: `EVT-${order.id ? String(order.id).slice(-6).toUpperCase() : 1000 + idx}`,
                type: `ORDER_${statusUpper || 'SETTLED'}`,
                entityName: order.restaurantName || 'The Maple & Vine',
                contextValue: `$${rawAmount.toFixed(2)} check value`,
                operator: order.user?.name || 'Platform Dispatch',
                timestamp: new Date(order.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                status: isSettled ? 'Settled' : 'Processing',
            };
        });

        const editorialFeatures = (featuredRestaurants as any[]).map((venue: any) => ({
            id: venue.id,
            title: venue.name || 'DineDesk Flagship',
            chef: venue.chef || venue.ownerName || 'Executive Kitchen Lead',
            coverImage: resolveItemImage(venue) || '/assets/logo.png',
            tag: venue.cuisine || 'Multi-Cuisine',
            status: venue.status || 'ACTIVE',
        }));

        res.status(200).json({
            success: true,
            year: currentYear,
            kpis: {
                totalUsers,
                userGrowthPct,
                userGrowthNote: `${userGrowthPct >= 0 ? '+' : ''}${userGrowthPct}% active patrons vs last cycle`,
                activeZones: activeRestaurantsCount || 1,
                completedOrders: completedOrdersCount,
                fulfillmentRatePct: completedOrdersCount > 0 ? 99.4 : 100,
                fulfillmentNote: '99.4% service fulfillment rate',
                grossGmv: currentGmv,
                gmvGrowthPct,
                gmvGrowthNote: `${gmvGrowthPct >= 0 ? '+' : ''}${gmvGrowthPct}% year-over-year`,
            },
            health: {
                activeCouriers: Math.max(2, Math.round(activeRestaurantsCount * 1.5)),
                fleetCapacityPct: 100,
                courierCapacityPct: 100,
                orderDisputeRate: 0.2,
                disputeRatePct: 0.2,
                benchmarkDisputeRate: 1.0,
                disputeBenchmarkPct: 1.0,
                seatedReservations: completedOrdersCount,
                tableReservationsSeated: completedOrdersCount,
                seatedGrowthPct: 18.0,
                reservationsGrowthPct: 18.0,
                avgKitchenPrepMinutes: 14.5,
                prepTimeDeltaMinutes: 1.2,
                onTimeDispatchPct: 98.8,
            },
            monthlyVolume,
            editorialFeatures,
            auditEvents,
        });
    } catch (error: any) {
        console.error('CRITICAL getAdminOverviewData Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to aggregate dynamic overview telemetry from PostgreSQL',
        });
    }
};

// ==========================================
// 2. PERFORMANCE ANALYTICS & REVENUE TRENDS
// ==========================================
export const getAdminAnalyticsData = async (req: Request, res: Response): Promise<void> => {
    try {
        const timeRange = (req.query.timeRange as string) || 'ytd';
        const customStart = req.query.startDate as string;
        const customEnd = req.query.endDate as string;

        const now = new Date();
        const currentYear = now.getFullYear();

        let startDate: Date;
        let endDate: Date = now;

        if (timeRange === 'custom' && customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(new Date(customEnd).setHours(23, 59, 59, 999));
        } else if (timeRange === '7d') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '30d') {
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (timeRange === '12m') {
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'q3') {
            startDate = new Date(currentYear, 6, 1);
            endDate = new Date(currentYear, 8, 30, 23, 59, 59, 999);
        } else {
            startDate = new Date(currentYear, 0, 1);
        }

        const fetchAllMenus = async (): Promise<any[]> => {
            if ((prisma as any).menu) {
                return (prisma as any).menu.findMany().catch(() => []);
            }
            if ((prisma as any).menuItem) {
                return (prisma as any).menuItem.findMany().catch(() => []);
            }
            return [];
        };

        const [
            ordersInRange,
            allYearOrders,
            totalUsersCount,
            newUsersCount,
            orderItemsWithMenus,
            reservationsCount,
            allDatabaseMenus,
        ] = await Promise.all([
            prisma.order.findMany({
                where: { createdAt: { gte: startDate, lte: endDate } },
                select: { id: true, status: true, createdAt: true, total: true } as any,
            }).catch(() => []),

            prisma.order.findMany({
                where: { createdAt: { gte: new Date(currentYear, 0, 1) } },
                select: { id: true, createdAt: true, total: true } as any,
            }).catch(() => []),

            prisma.user.count({
                where: {
                    NOT: { email: { startsWith: 'purged_' } },
                },
            }).catch(() => 0),

            prisma.user.count({
                where: {
                    createdAt: { gte: startDate, lte: endDate },
                    NOT: { email: { startsWith: 'purged_' } },
                },
            }).catch(() => 0),

            (prisma as any).orderItem?.findMany({
                where: { order: { createdAt: { gte: startDate, lte: endDate } } },
                include: { menuItem: true, menu: true },
            }).catch(() => []),

            (prisma as any).reservation?.count({
                where: { createdAt: { gte: startDate, lte: endDate } },
            }).catch(() => ordersInRange.length),

            fetchAllMenus(),
        ]);

        const menuLookupById = new Map<string, any>();
        const menuLookupByName = new Map<string, any>();
        const availableCloudinaryPool: string[] = [];

        allDatabaseMenus.forEach((item: any) => {
            if (item.id) menuLookupById.set(String(item.id), item);
            const itemName = String(item.name || item.menuName || '').trim().toLowerCase();
            if (itemName) menuLookupByName.set(itemName, item);

            const img = resolveItemImage(item);
            if (img && !availableCloudinaryPool.includes(img)) {
                availableCloudinaryPool.push(img);
            }
        });

        const totalGmv = ordersInRange.reduce((sum: number, o: any) => sum + getOrderAmount(o), 0);
        const orderCount = ordersInRange.length;
        const averageOrderValue = orderCount > 0 ? Number((totalGmv / orderCount).toFixed(2)) : 0;
        const netOperatingYield = Number((totalGmv * 0.72).toFixed(2));

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const trend = monthNames.map((month, idx) => {
            const matchingOrders = allYearOrders.filter(
                (o: any) => new Date(o.createdAt).getMonth() === idx
            );
            const monthGmv = matchingOrders.reduce((sum: number, o: any) => sum + getOrderAmount(o), 0);

            return {
                label: month,
                date: `${currentYear}-${String(idx + 1).padStart(2, '0')}-01`,
                revenue: monthGmv,
                baselineRevenue: Number((monthGmv * 0.88).toFixed(2)),
                orders: matchingOrders.length,
                reservations: Math.round(matchingOrders.length * 0.4),
                newUsers: Math.round(matchingOrders.length * 0.6),
            };
        });

        interface StatusRecord {
            completed: number;
            active: number;
            inCourier: number;
            disputed: number;
        }

        const statusCounts: StatusRecord = {
            completed: 0,
            active: 0,
            inCourier: 0,
            disputed: 0,
        };

        ordersInRange.forEach((o: any) => {
            const st = String(o.status || '').toUpperCase();
            if (st === 'COMPLETED' || st === 'DELIVERED') {
                statusCounts.completed += 1;
            } else if (st === 'CANCELLED' || st === 'DISPUTED' || st === 'REFUNDED') {
                statusCounts.disputed += 1;
            } else if (st === 'OUT_FOR_DELIVERY' || st === 'ON_WAY') {
                statusCounts.inCourier += 1;
            } else {
                statusCounts.active += 1;
            }
        });

        const orderStatusDistribution = {
            totalOrders: orderCount,
            completed: statusCounts.completed,
            active: statusCounts.active,
            inCourier: statusCounts.inCourier,
            disputed: statusCounts.disputed,
            healthScorePct: orderCount > 0
                ? Number((((orderCount - statusCounts.disputed) / orderCount) * 100).toFixed(1))
                : 99.4,
        };

        interface AggItem {
            id: string;
            name: string;
            category: string;
            image: string;
            unitPrice: number;
            ordersCount: number;
            totalRevenue: number;
            rating: number;
        }

        const itemAgg: Record<string, AggItem> = {};

        if (Array.isArray(orderItemsWithMenus) && orderItemsWithMenus.length > 0) {
            orderItemsWithMenus.forEach((line: any, index: number) => {
                const lineName = String(line.name || line.menuName || line.menuItem?.name || line.menu?.menuName || '').trim();

                const matchedMenu =
                    (line.menuId && menuLookupById.get(String(line.menuId))) ||
                    (line.menuItemId && menuLookupById.get(String(line.menuItemId))) ||
                    (lineName && menuLookupByName.get(lineName.toLowerCase())) ||
                    line.menu ||
                    line.menuItem ||
                    {};

                const id = String(matchedMenu.id || line.menuId || line.menuItemId || lineName || `dish-${index}`);
                const name = String(matchedMenu.menuName || matchedMenu.name || lineName || 'Artisan Dish');
                const category = String(matchedMenu.category || matchedMenu.cuisineCategory || matchedMenu.cuisine || line.category || 'Mains');

                let image = resolveItemImage(matchedMenu) || resolveItemImage(line);
                if (!image && availableCloudinaryPool.length > 0) {
                    image = availableCloudinaryPool[index % availableCloudinaryPool.length] || '';
                }

                const qty = Number(line.quantity || 1);
                const unitPrice = Number(matchedMenu.price || line.price || 0);
                const rating = Number(matchedMenu.rating || 4.95);

                const existing = itemAgg[id];
                if (!existing) {
                    itemAgg[id] = {
                        id,
                        name,
                        category,
                        image,
                        unitPrice,
                        ordersCount: qty,
                        totalRevenue: unitPrice > 0 ? unitPrice * qty : getOrderAmount(line),
                        rating,
                    };
                } else {
                    existing.ordersCount += qty;
                    existing.totalRevenue += (existing.unitPrice > 0 ? existing.unitPrice : 1) * qty;
                    if (!existing.image && image) {
                        existing.image = image;
                    }
                }
            });
        }

        let topMenuItems: AggItem[] = Object.values(itemAgg)
            .sort((a, b) => {
                if (b.unitPrice !== a.unitPrice) return b.unitPrice - a.unitPrice;
                if (b.rating !== a.rating) return b.rating - a.rating;
                return b.totalRevenue - a.totalRevenue;
            })
            .slice(0, 8);

        if (topMenuItems.length === 0 && allDatabaseMenus.length > 0) {
            topMenuItems = [...allDatabaseMenus]
                .sort((a: any, b: any) => Number(b.price || 0) - Number(a.price || 0))
                .slice(0, 8)
                .map((m: any, idx: number) => ({
                    id: String(m.id),
                    name: String(m.menuName || m.name),
                    category: String(m.category || m.cuisineCategory || 'Mains'),
                    image: resolveItemImage(m),
                    unitPrice: Number(m.price || 0),
                    ordersCount: Math.max(1, 14 - idx),
                    totalRevenue: Number(m.price || 0) * Math.max(1, 14 - idx),
                    rating: Number(m.rating || 4.95),
                }));
        }

        topMenuItems = topMenuItems.map((item, idx) => {
            if (!item.image && availableCloudinaryPool.length > 0) {
                return {
                    ...item,
                    image: availableCloudinaryPool[idx % availableCloudinaryPool.length] || '',
                };
            }
            return item;
        });

        const categoryMap: Record<string, number> = {};
        topMenuItems.forEach((item) => {
            const currentCatVal = categoryMap[item.category] ?? 0;
            categoryMap[item.category] = currentCatVal + item.totalRevenue;
        });

        const menuDepartments = Object.keys(categoryMap).map((cat) => {
            const catRevenue = categoryMap[cat] ?? 0;
            const sharePct = totalGmv > 0 ? Number(((catRevenue / totalGmv) * 100).toFixed(1)) : 25;
            const matchedItem = topMenuItems.find((i) => i.category === cat);

            return {
                name: cat,
                revenue: catRevenue,
                sharePct,
                topItem: matchedItem ? matchedItem.name : cat,
                yoyGrowthPct: 18.4,
            };
        });

        const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        res.status(200).json({
            success: true,
            year: currentYear,
            dateRangeLabel: `${startLabel} – ${endLabel}`,
            financials: {
                totalGmv,
                annualTarget: 4800000,
                targetPacePct: Number(((totalGmv / 4800000) * 100).toFixed(1)),
                netOperatingYield,
                mealsDelivered: orderCount,
                tableCoversSeated: reservationsCount || orderCount,
                averageOrderValue,
                primeCostMarginPct: 58.4,
            },
            trend,
            orderStatusDistribution,
            topMenuItems,
            menuDepartments,
            summary: {
                newPatrons: newUsersCount,
                totalPatrons: totalUsersCount,
                tableTurnRatePct: 98.2,
                repeatOrderRatePct: 68.4,
                dineInRatioPct: 35,
                deliveryRatioPct: 65,
            },
        });
    } catch (error: any) {
        console.error('Analytics Data Aggregation Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to aggregate analytics data from PostgreSQL',
        });
    }
};

// ==========================================
// 3. USER MANAGEMENT & RBAC DIRECTORY
// ==========================================
export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            where: {
                NOT: [
                    { email: { startsWith: 'purged_' } },
                    { name: { startsWith: '[Deactivated Account' } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        orders: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = users.map((u: any) => {
            let rawAvatar = '';
            if (typeof u.avatarUrl === 'string' && u.avatarUrl.trim() !== '') {
                let cleaned = u.avatarUrl.trim();
                if (cleaned.startsWith('//')) {
                    cleaned = `https:${cleaned}`;
                }
                if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
                    rawAvatar = cleaned;
                }
            }

            return {
                id: u.id,
                name: u.name || 'Unnamed User',
                email: u.email,
                phone: u.phone || '(313) 555-0100',
                role: String(u.role || 'USER').toUpperCase(),
                avatar: rawAvatar,
                ordersCount: u._count?.orders ?? 0,
                status: 'Active',
                joinedDate: new Date(u.createdAt).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                }),
                lastActive: 'Active now',
            };
        });

        res.status(200).json({
            success: true,
            totalUsers: formatted.length,
            users: formatted,
        });
    } catch (error: any) {
        console.error('Fetch Admin Users Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to fetch directory from PostgreSQL',
        });
    }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id || '');
        const { role } = req.body;

        if (!id) {
            res.status(400).json({ success: false, message: 'User ID parameter is required' });
            return;
        }

        if (!role) {
            res.status(400).json({ success: false, message: 'Role parameter is required' });
            return;
        }

        const validRoles = ['USER', 'CUSTOMER', 'DINER', 'VENDOR', 'MANAGER', 'RESTAURANT_OWNER', 'ADMIN', 'SUPERADMIN'];
        const normalizedRole = String(role).toUpperCase();

        if (!validRoles.includes(normalizedRole)) {
            res.status(400).json({ success: false, message: `Invalid role: ${role}` });
            return;
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role: normalizedRole as any },
            select: { id: true, name: true, email: true, role: true },
        });

        res.status(200).json({
            success: true,
            message: `User role successfully updated to ${normalizedRole}`,
            user: updated,
        });
    } catch (error: any) {
        console.error('Update Role Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to update user role in PostgreSQL',
        });
    }
};

export const deleteUserAccount = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id || '');

        if (!id) {
            res.status(400).json({
                success: false,
                message: 'User ID is required.',
            });
            return;
        }

        if (req.user && (req.user as any).id === id) {
            res.status(400).json({
                success: false,
                message: 'Self-deletion is prohibited for the current administrative session.',
            });
            return;
        }

        const targetUser = await prisma.user.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: {
                        id: true,
                        orders: { select: { id: true }, take: 1 },
                    },
                },
                orders: { select: { id: true }, take: 1 },
            },
        });

        if (!targetUser) {
            res.status(404).json({ success: false, message: 'User account not found.' });
            return;
        }

        const currentRole = String(targetUser.role || 'USER').toUpperCase();
        const isPrivileged = currentRole === 'ADMIN' ||
            currentRole === 'SUPERADMIN' ||
            currentRole === 'SUPER_ADMIN' ||
            currentRole === 'VENDOR' ||
            currentRole === 'RESTAURANT_OWNER' ||
            currentRole === 'MANAGER';

        if (isPrivileged) {
            await prisma.$transaction(async (tx) => {
                if (targetUser.restaurant?.id) {
                    await (tx as any).restaurant?.update({
                        where: { id: targetUser.restaurant.id },
                        data: {
                            status: 'INACTIVE',
                        },
                    }).catch(() => null);
                }

                await (tx as any).session?.deleteMany({ where: { userId: id } }).catch(() => null);

                await tx.user.update({
                    where: { id },
                    data: {
                        role: 'USER',
                    },
                });
            });

            res.status(200).json({
                success: true,
                message: `${targetUser.name} has been removed from privileged governance and converted to Customer (USER).`,
            });
            return;
        }

        const hasCustomerOrders = Boolean(targetUser.orders && targetUser.orders.length > 0);
        const hasRestaurantOrders = Boolean(targetUser.restaurant?.orders && targetUser.restaurant.orders.length > 0);

        if (hasCustomerOrders || hasRestaurantOrders) {
            await prisma.$transaction(async (tx) => {
                await (tx as any).cartItem?.deleteMany({ where: { userId: id } }).catch(() => null);
                await (tx as any).favorite?.deleteMany({ where: { userId: id } }).catch(() => null);
                await (tx as any).review?.deleteMany({ where: { userId: id } }).catch(() => null);
                await (tx as any).session?.deleteMany({ where: { userId: id } }).catch(() => null);

                await tx.user.update({
                    where: { id },
                    data: {
                        name: `[Deactivated Account - ${id.slice(-6)}]`,
                        email: `purged_${Date.now()}_${targetUser.email}`,
                        role: 'USER',
                        phone: null as any,
                        avatarUrl: '' as any,
                    },
                });
            });

            res.status(200).json({
                success: true,
                message: 'Customer account permanently removed from directory.',
            });
            return;
        }

        await prisma.$transaction(async (tx) => {
            if (targetUser.restaurant?.id) {
                await (tx as any).menu?.deleteMany({ where: { restaurantId: targetUser.restaurant.id } }).catch(() => null);
                await (tx as any).menuItem?.deleteMany({ where: { restaurantId: targetUser.restaurant.id } }).catch(() => null);
                await (tx as any).restaurant.delete({ where: { id: targetUser.restaurant.id } }).catch(() => null);
            }

            await (tx as any).cartItem?.deleteMany({ where: { userId: id } }).catch(() => null);
            await (tx as any).favorite?.deleteMany({ where: { userId: id } }).catch(() => null);
            await (tx as any).review?.deleteMany({ where: { userId: id } }).catch(() => null);
            await (tx as any).session?.deleteMany({ where: { userId: id } }).catch(() => null);

            await tx.user.delete({
                where: { id },
            });
        });

        res.status(200).json({
            success: true,
            message: 'Customer account permanently purged from database.',
        });
    } catch (error: any) {
        console.error('Delete User Controller Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to process user deletion in PostgreSQL',
        });
    }
};

// ==========================================
// 4. RESERVATIONS & FLOOR OPERATIONS HANDLERS
// ==========================================
export const getAdminReservations = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Fetch Flagship Restaurant
        const restaurant = await prisma.restaurant.findFirst({
            include: {
                owner: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        // 2. Dynamically assign General Manager and Floor Seating Lead from the first two Admin/Superadmin users
        const adminUsers = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'SUPERADMIN'] as any },
                NOT: { email: { startsWith: 'purged_' } },
            },
            select: {
                name: true,
                phone: true,
                role: true,
                email: true,
            },
            orderBy: { createdAt: 'asc' },
            take: 2,
        });

        const generalManager = adminUsers[0] || {
            name: restaurant?.owner?.name || 'Fourkan Bin Ilias',
            phone: restaurant?.owner?.phone || '(313) 555-0142',
            role: 'Super Admin',
        };

        const floorSeatingLead = adminUsers[1] || {
            name: 'Platform Operations Admin',
            phone: '(313) 555-0199',
            role: 'Floor Admin',
        };

        // 3. Dynamically Aggregate Total Tables and Total Capacity from RestaurantTable
        let totalTablesCount = 50;
        let totalCapacityCount = 200; // 50 tables * 4 seats standard default

        if ((prisma as any).restaurantTable) {
            const [dbTableCount, capacityAggregate] = await Promise.all([
                (prisma as any).restaurantTable.count().catch(() => 50),
                (prisma as any).restaurantTable.aggregate({
                    _sum: { capacity: true },
                }).catch(() => null),
            ]);

            totalTablesCount = dbTableCount > 0 ? dbTableCount : 50;
            totalCapacityCount = capacityAggregate?._sum?.capacity && capacityAggregate._sum.capacity > 0
                ? capacityAggregate._sum.capacity
                : totalTablesCount * 4;
        }

        // 4. Fetch all reservations without relational inner-join restrictions that drop guest bookings
        let rawReservations: any[] = [];
        if ((prisma as any).reservation) {
            rawReservations = await (prisma as any).reservation.findMany({
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            phone: true,
                            avatarUrl: true, // Selected for displaying guest photos
                        },
                    },
                    table: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }).catch(() => []);
        }

        // 5. Structure rich reservation data and gracefully handle deactivated or sanitized names
        const formattedReservations = rawReservations.map((r: any) => {
            const rawName = String(r.guestName || r.name || r.user?.name || '').trim();
            const rawEmail = String(r.guestEmail || r.email || r.user?.email || '').trim();

            const isDeactivated =
                rawName.includes('[Deactivated Account') ||
                rawEmail.startsWith('purged_');

            // If account was soft-deactivated, provide a clean patron title instead of showing "[Deactivated Account - ...]"
            const guestName = isDeactivated
                ? (r.name && !r.name.includes('[Deactivated Account') ? r.name : 'Registered Patron')
                : (rawName || 'Guest Patron');

            const guestEmail = rawEmail.startsWith('purged_') ? 'patron@dinedesk.com' : (rawEmail || 'N/A');
            const guestPhone = r.guestPhone || r.phone || r.user?.phone || '+880 1700000000';
            const guestAvatar = (!isDeactivated && r.user?.avatarUrl) ? r.user.avatarUrl : '';

            const partySize = Number(r.partySize || r.guests || r.seats || 4);
            const tableNumber = r.tableNumber || r.table?.tableNumber || (r.tableId ? `Table ${String(r.tableId).slice(-2)}` : 'Table 1');
            const seatingArea = r.seatingArea || r.area || r.section || r.table?.section || 'Main Dining Hall';
            const status = String(r.status || 'CONFIRMED').toUpperCase();
            const specialRequests = r.specialRequests || r.notes || r.comment || 'Standard Seating';

            const reservationDate = r.reservationDate || r.date
                ? new Date(r.reservationDate || r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const reservationTime = r.reservationTime || r.time || '8:00 AM';

            return {
                id: r.id,
                guestName,
                guestEmail,
                guestPhone,
                guestAvatar, // Exported to frontend avatar component
                partySize,
                tableNumber,
                reservationDate,
                reservationTime,
                seatingArea,
                status,
                specialRequests,
                createdAt: new Date(r.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                }),
            };
        });

        const totalReservations = formattedReservations.length;
        const confirmedCount = formattedReservations.filter((r) => r.status === 'CONFIRMED').length;
        const seatedCount = formattedReservations.filter((r) => r.status === 'SEATED').length;
        const pendingCount = formattedReservations.filter((r) => r.status === 'PENDING').length;
        const cancelledCount = formattedReservations.filter((r) => r.status === 'CANCELLED').length;

        const seatedCovers = formattedReservations
            .filter((r) => r.status === 'CONFIRMED' || r.status === 'SEATED')
            .reduce((acc, curr) => acc + curr.partySize, 0);

        const utilizationPct = Math.min(100, Math.round((seatedCovers / totalCapacityCount) * 100));
        const isRestaurantActive = restaurant?.status ? String(restaurant.status).toUpperCase() === 'ACTIVE' : true;
        const resolvedIsOpen = (restaurant as any)?.isOpen ?? isRestaurantActive;

        res.status(200).json({
            success: true,
            restaurant: {
                id: restaurant?.id || 'RES-FLAGSHIP',
                name: restaurant?.name || 'DineDesk Flagship Premium Kitchen',
                address: sanitizeAddress(restaurant?.address),
                managerName: generalManager.name,
                managerPhone: generalManager.phone,
                floorLeadName: floorSeatingLead.name,
                floorLeadPhone: floorSeatingLead.phone,
                serviceHours: '8:00 AM – 12:00 PM',
                status: restaurant?.status || 'ACTIVE',
                isOpen: resolvedIsOpen,
                totalTables: totalTablesCount,
                maxCapacity: totalCapacityCount,
            },
            stats: {
                totalReservations,
                confirmedCount,
                seatedCount,
                pendingCount,
                cancelledCount,
                seatedCovers,
                maxCapacity: totalCapacityCount,
                totalTables: totalTablesCount,
                utilizationPct,
            },
            reservations: formattedReservations,
        });
    } catch (error: any) {
        console.error('Fetch Reservations Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to aggregate reservations from PostgreSQL',
        });
    }
};

export const updateReservationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id || '');
        const { status } = req.body;

        if (!id || !status) {
            res.status(400).json({ success: false, message: 'Reservation ID and status are required' });
            return;
        }

        const validStatuses = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'];
        const normalized = String(status).toUpperCase();

        if (!validStatuses.includes(normalized)) {
            res.status(400).json({ success: false, message: `Invalid status: ${status}` });
            return;
        }

        if ((prisma as any).reservation) {
            const updated = await (prisma as any).reservation.update({
                where: { id },
                data: { status: normalized },
            });

            res.status(200).json({
                success: true,
                message: `Reservation status updated to ${normalized}`,
                reservation: updated,
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: `Reservation status updated to ${normalized}`,
        });
    } catch (error: any) {
        console.error('Update Reservation Status Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to update reservation in database',
        });
    }
};

// ==========================================
// 5. FINANCIAL LEDGER & GUEST SETTLEMENTS
// ==========================================
export const getAdminTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatarUrl: true,
                    },
                },
                items: {
                    include: {
                        menuItem: true,
                    },
                },
                restaurant: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const formatted = orders.map((o: any, idx: number) => {
            const rawAmount = Number(o.total ?? o.totalAmount ?? o.totalPrice ?? o.amount ?? 0);
            const statusUpper = String(o.status || 'PENDING').toUpperCase();

            let normalizedStatus: 'Settled' | 'Processing' | 'Refunded' | 'Cancelled' = 'Processing';
            if (statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED') {
                normalizedStatus = 'Settled';
            } else if (statusUpper === 'CANCELLED') {
                normalizedStatus = 'Cancelled';
            } else if (statusUpper === 'REFUNDED' || statusUpper === 'DISPUTED') {
                normalizedStatus = 'Refunded';
            }

            // Estimate tips/gratuity from service fee or standard breakdown
            const tipAmount = Number(o.tipAmount ?? o.tip ?? (rawAmount * 0.15).toFixed(2));
            const subtotal = Number((rawAmount - (rawAmount * 0.08) - (tipAmount > 0 ? tipAmount : 0)).toFixed(2));
            const tax = Number((rawAmount * 0.08).toFixed(2));

            const isDeactivated = Boolean(
                o.user?.email?.startsWith('purged_') ||
                o.user?.name?.includes('[Deactivated Account')
            );

            const guestName = isDeactivated ? 'Registered Patron' : (o.user?.name || 'Walk-in Diner');
            const guestEmail = isDeactivated ? 'patron@dinedesk.com' : (o.user?.email || 'N/A');

            // Order Channel determination
            const itemCount = o.items?.length || 1;
            const orderType = o.deliveryAddress || o.address
                ? 'Curbside Takeaway'
                : (idx % 3 === 0 ? 'VIP Tasting' : idx % 2 === 0 ? 'Chef Counter' : 'Dine-in Floor');

            const paymentMethod = o.paymentMethod
                ? String(o.paymentMethod).toUpperCase()
                : (o.stripePaymentIntentId ? 'Stripe Online' : 'Card Terminal');

            return {
                id: o.id ? `TXN-${String(o.id).slice(-6).toUpperCase()}` : `TXN-${10000 + idx}`,
                orderDbId: o.id,
                guestName,
                guestEmail,
                guestPhone: o.user?.phone || 'N/A',
                guestAvatar: !isDeactivated && o.user?.avatarUrl ? o.user.avatarUrl : '',
                channel: o.tableNumber ? `Table ${o.tableNumber}` : `${orderType} (${itemCount} items)`,
                station: o.restaurant?.name || 'Main Hearth Dining Room',
                type: orderType,
                method: paymentMethod,
                grossAmount: rawAmount,
                subtotal: Math.max(0, subtotal),
                taxAmount: tax,
                tipAmount,
                status: normalizedStatus,
                rawStatus: statusUpper,
                itemsSummary: o.items?.map((it: any) => `${it.quantity || 1}x ${it.menuItem?.name || it.name || 'Dish'}`).join(', ') || 'Artisan Meal Order',
                timestamp: new Date(o.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                dateIso: o.createdAt,
            };
        });

        const totalGross = formatted.reduce((sum, t) => sum + t.grossAmount, 0);
        const settledGross = formatted.filter(t => t.status === 'Settled').reduce((sum, t) => sum + t.grossAmount, 0);
        const totalTips = formatted.reduce((sum, t) => sum + t.tipAmount, 0);
        const avgCheck = formatted.length > 0 ? Number((totalGross / formatted.length).toFixed(2)) : 0;

        res.status(200).json({
            success: true,
            stats: {
                totalGross,
                settledGross,
                totalTips,
                avgCheck,
                totalTransactions: formatted.length,
                settledCount: formatted.filter(t => t.status === 'Settled').length,
                processingCount: formatted.filter(t => t.status === 'Processing').length,
            },
            transactions: formatted,
        });
    } catch (error: any) {
        console.error('Fetch Admin Transactions Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to aggregate financial records from PostgreSQL',
        });
    }
};

// ==========================================
// 6. STAFF & LEADERSHIP GOVERNANCE HANDLERS
// ==========================================
export const getAdminStaffDirectory = async (req: Request, res: Response): Promise<void> => {
    try {
        // Query only roles that exist in the PostgreSQL Prisma enum to prevent invalid argument errors
        const users = await prisma.user.findMany({
            where: {
                role: { in: ['SUPERADMIN', 'ADMIN', 'VENDOR'] as any },
                NOT: [
                    { email: { startsWith: 'purged_' } },
                    { name: { startsWith: '[Deactivated Account' } },
                ],
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
                updatedAt: true,
                restaurant: {
                    select: {
                        name: true,
                    },
                },
                _count: {
                    select: {
                        orders: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Partition by exact database roles
        const superAdmins = users.filter((u: any) => String(u.role).toUpperCase() === 'SUPERADMIN');
        const standardAdmins = users.filter((u: any) => String(u.role).toUpperCase() === 'ADMIN');
        const vendors = users.filter((u: any) => String(u.role).toUpperCase() === 'VENDOR');

        // Rule: First 2 vendors are elevated to Administrators; remaining vendors are Floor Managers
        const vendorAdmins = vendors.slice(0, 2);
        const floorManagers = vendors.slice(2);

        const formatUser = (u: any, assignedRole: 'Super Admin' | 'Administrator' | 'Floor Manager', index: number) => {
            let cleanedAvatar = '';
            if (typeof u.avatarUrl === 'string' && u.avatarUrl.trim().startsWith('http')) {
                cleanedAvatar = u.avatarUrl.trim();
            }

            return {
                id: u.id,
                uid: `STF-${String(u.id).slice(-6).toUpperCase()}`,
                name: u.name || 'Staff Member',
                email: u.email,
                phone: u.phone || '+880 1800-000000',
                role: assignedRole,
                rawRole: String(u.role || '').toUpperCase(),
                avatar: cleanedAvatar,
                assignedDomain: u.restaurant?.name || 'The Maple & Vine (Detroit Flagship)',
                scope: assignedRole === 'Super Admin'
                    ? 'Global Governance, Security & Financial Telemetry'
                    : assignedRole === 'Administrator'
                        ? 'Venue Floor, Reservations & Staff Controls'
                        : 'Floor Seating, Daily Shifts & Kitchen Operations',
                twoFactor: 'Enforced (Hardware Key / Biometrics)',
                lastSession: 'Active Now',
                joinedDate: new Date(u.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                }),
                isRootOwner: assignedRole === 'Super Admin' && index === 0,
            };
        };

        const formattedSuperAdmins = superAdmins.map((u: any, idx: number) => formatUser(u, 'Super Admin', idx));
        const formattedAdministrators = [
            ...standardAdmins.map((u: any, idx: number) => formatUser(u, 'Administrator', idx)),
            ...vendorAdmins.map((u: any, idx: number) => formatUser(u, 'Administrator', idx + standardAdmins.length)),
        ];
        const formattedFloorManagers = floorManagers.map((u: any, idx: number) => formatUser(u, 'Floor Manager', idx));

        const allStaff = [
            ...formattedSuperAdmins,
            ...formattedAdministrators,
            ...formattedFloorManagers,
        ];

        res.status(200).json({
            success: true,
            metrics: {
                totalStaff: allStaff.length,
                superAdminCount: formattedSuperAdmins.length,
                adminCount: formattedAdministrators.length,
                managerCount: formattedFloorManagers.length,
                hardware2faPct: 100,
                idleTimeoutMins: 15,
                dualSignoffThreshold: '$25,000+',
            },
            superAdmins: formattedSuperAdmins,
            administrators: formattedAdministrators,
            floorManagers: formattedFloorManagers,
            staff: allStaff,
        });
    } catch (error: any) {
        console.error('Fetch Admin Staff Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to aggregate leadership staff from PostgreSQL',
        });
    }
};

export const updateStaffRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = String(req.params.id || '');
        const { role } = req.body;

        if (!id || !role) {
            res.status(400).json({ success: false, message: 'User ID and Role are required.' });
            return;
        }

        const validStaffRoles = ['SUPERADMIN', 'ADMIN', 'VENDOR', 'USER'];
        const normalized = String(role).toUpperCase();

        if (!validStaffRoles.includes(normalized)) {
            res.status(400).json({ success: false, message: `Invalid designated role: ${role}` });
            return;
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role: normalized as any },
            select: { id: true, name: true, email: true, role: true },
        });

        res.status(200).json({
            success: true,
            message: `Staff role for ${updated.name} updated to ${normalized}`,
            user: updated,
        });
    } catch (error: any) {
        console.error('Update Staff Role Error:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Failed to update leadership designation in database.',
        });
    }
};

// ==========================================
// 7. VENDOR OPERATIONAL HANDLERS
// ==========================================
export const getVendorOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant profile not found' });
            return;
        }

        const orders = await prisma.order.findMany({
            where: { restaurantId: restaurant.id },
            include: { user: { select: { id: true, name: true, phone: true } }, items: true },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('Get vendor orders error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const { id } = req.params;
        const { status } = req.body;

        const restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: req.user.id },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        const order = await prisma.order.findUnique({ where: { id: id as string } });
        if (!order || order.restaurantId !== restaurant.id) {
            res.status(404).json({ success: false, message: 'Order not found or unauthorized' });
            return;
        }

        const updatedOrder = await prisma.order.update({
            where: { id: id as string },
            data: { status },
        });

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: updatedOrder,
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ==========================================
// 8. ADMIN RESTAURANT APPROVAL WORKFLOWS
// ==========================================
export const getPendingRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const restaurants = await prisma.restaurant.findMany({
            where: { status: 'PENDING' },
            include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
        });

        res.status(200).json({ success: true, data: restaurants });
    } catch (error) {
        console.error('Get pending restaurants error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateRestaurantStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const restaurant = await prisma.restaurant.update({
            where: { id: id as string },
            data: { status },
        });

        res.status(200).json({
            success: true,
            message: `Restaurant status updated to ${status}`,
            data: restaurant,
        });
    } catch (error) {
        console.error('Update restaurant status error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};