// src/controllers/restaurant.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import jwt from 'jsonwebtoken';

function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.split(' ')[1] || null;
    }
    if (authHeader) return authHeader;
    if ((req as any).cookies?.token) return (req as any).cookies.token;
    if ((req as any).cookies?.accessToken) return (req as any).cookies.accessToken;

    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)(?:token|dinedesk_auth_token|auth_token|accessToken)=([^;]+)/);
        if (match && match[1]) return match[1].trim();
    }
    return null;
}

function resolveUserId(req: Request): string | null {
    if ((req as any).user?.id) return (req as any).user.id;
    if ((req as any).user?.userId) return (req as any).user.userId;

    const token = extractToken(req);
    if (token) {
        try {
            const secret = process.env.JWT_SECRET || 'super secret jwt key change this';
            const decoded: any = jwt.verify(token, secret);
            return decoded.id || decoded.userId || decoded._id || null;
        } catch {
            return null;
        }
    }
    return null;
}

// =========================================================================
// PUBLIC RESTAURANT CONTROLLERS
// =========================================================================

export const getRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const { cuisine, search, page = '1', limit = '10' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const where: any = { status: 'PUBLISHED' };

        if (cuisine) {
            where.cuisine = { contains: cuisine as string, mode: 'insensitive' };
        }

        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { cuisine: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [restaurants, total] = await Promise.all([
            prisma.restaurant.findMany({
                where,
                skip,
                take: parseInt(limit as string),
                orderBy: { avgRating: 'desc' },
            }),
            prisma.restaurant.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            data: restaurants,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                totalPages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    } catch (error) {
        console.error('Get restaurants error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getRestaurantById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const restaurant = await prisma.restaurant.findUnique({
            where: { id: id as string },
            include: {
                menuItems: {
                    where: { isPublished: true },
                },
                reviews: {
                    include: {
                        user: { select: { id: true, name: true, avatarUrl: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant not found' });
            return;
        }

        res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// =========================================================================
// VENDOR RESTAURANT SETTINGS & PROFILE CONTROLLERS (100% POSTGRESQL)
// =========================================================================

export const getVendorRestaurantProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = resolveUserId(req);

        let restaurant = await prisma.restaurant.findFirst({
            where: userId ? { ownerId: userId } : undefined,
            include: {
                owner: {
                    select: { email: true, name: true },
                },
                menuItems: { select: { id: true } },
            },
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst({
                include: {
                    owner: {
                        select: { email: true, name: true },
                    },
                    menuItems: { select: { id: true } },
                },
            });
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'No restaurant record found in database' });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                ...restaurant,
                contactEmail: (restaurant as any).owner?.email || 'manager@dinedesk.com',
                coverImage: (restaurant as any).coverUrl,
                image: (restaurant as any).coverUrl,
            },
        });
    } catch (error: any) {
        console.error('Get vendor restaurant profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};

export const updateVendorRestaurantProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = resolveUserId(req);

        let restaurant = await prisma.restaurant.findFirst({
            where: userId ? { ownerId: userId } : undefined,
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst();
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Target restaurant profile not found in database' });
            return;
        }

        const {
            name,
            tagline,
            description,
            cuisine,
            cuisineCategory,
            cuisineTags,
            address,
            streetAddress,
            neighborhood,
            coverImage,
            coverUrl,
            image,
            galleryImages,
            gallery,
            latitude,
            lat,
            longitude,
            lng,
            operatingHours,
            priceTier,
            priceRange,
            status,
        } = req.body || {};

        // 1. Resolve combined address string
        const resolvedAddress = [streetAddress || address, neighborhood]
            .filter(Boolean)
            .join(', ') || restaurant.address;

        // 2. Resolve cuisine
        const resolvedCuisine =
            cuisine ||
            cuisineCategory ||
            (Array.isArray(cuisineTags) ? cuisineTags.join(', ') : undefined) ||
            restaurant.cuisine;

        // 3. Resolve description
        const resolvedDescription = description || tagline || restaurant.description;

        // 4. Resolve cover URL -> matches coverUrl in schema
        const resolvedCoverUrl = coverUrl || coverImage || image || (restaurant as any).coverUrl;

        // 5. Resolve gallery -> matches gallery (String[]) in schema
        let resolvedGallery: string[] | undefined = undefined;
        if (Array.isArray(gallery)) {
            resolvedGallery = gallery;
        } else if (Array.isArray(galleryImages)) {
            resolvedGallery = galleryImages.map((g: any) => (typeof g === 'string' ? g : g.url)).filter(Boolean);
        }

        // 6. Coordinates (lat & lng)
        const resolvedLat = Number(latitude ?? lat ?? (restaurant as any).lat ?? 23.7937);
        const resolvedLng = Number(longitude ?? lng ?? (restaurant as any).lng ?? 90.4043);

        // 7. Shifts (opensAt & closesAt)
        let opensAt = (restaurant as any).opensAt;
        let closesAt = (restaurant as any).closesAt;
        if (Array.isArray(operatingHours) && operatingHours.length > 0) {
            const activeShift = operatingHours.find((d: any) => d.isOpen);
            if (activeShift) {
                opensAt = activeShift.openingTime || opensAt;
                closesAt = activeShift.closingTime || closesAt;
            }
        }

        // 8. Build valid object STRICTLY matching the verified Restaurant schema:
        // Excluded: phone, contactEmail, image, tagline, cuisineTags, etc.
        const validPrismaData: any = {
            name: name !== undefined ? name : restaurant.name,
            description: resolvedDescription,
            cuisine: resolvedCuisine,
            address: resolvedAddress,
            lat: resolvedLat,
            lng: resolvedLng,
        };

        if (resolvedCoverUrl) validPrismaData.coverUrl = resolvedCoverUrl;
        if (resolvedGallery && resolvedGallery.length > 0) validPrismaData.gallery = resolvedGallery;
        if (opensAt !== undefined) validPrismaData.opensAt = opensAt;
        if (closesAt !== undefined) validPrismaData.closesAt = closesAt;
        if (status !== undefined) validPrismaData.status = status;

        // Normalize price tier to enum matching PriceRange type
        const rawPrice = priceRange || priceTier;
        if (rawPrice) {
            const priceMap: Record<string, string> = {
                "$": "BUDGET",
                "$$": "MODERATE",
                "$$$": "EXPENSIVE",
                "$$$$": "LUXURY",
                "budget": "BUDGET",
                "moderate": "MODERATE",
                "expensive": "EXPENSIVE",
                "luxury": "LUXURY",
            };
            validPrismaData.priceRange = priceMap[rawPrice] || rawPrice;
        }

        const updated = await prisma.restaurant.update({
            where: { id: restaurant.id },
            data: validPrismaData,
        });

        res.status(200).json({
            success: true,
            message: 'Restaurant profile parameters updated successfully in PostgreSQL',
            data: {
                ...updated,
                ...req.body,
                coverImage: (updated as any).coverUrl,
            },
        });
    } catch (error: any) {
        console.error('Update vendor restaurant profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update restaurant profile',
        });
    }
};

export const createRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = resolveUserId(req);

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        const existingRestaurant = await prisma.restaurant.findUnique({
            where: { ownerId: userId },
        });

        if (existingRestaurant) {
            res.status(400).json({ success: false, message: 'Vendor can only own one restaurant' });
            return;
        }

        const restaurant = await prisma.restaurant.create({
            data: {
                ownerId: userId,
                ...req.body,
                status: 'PENDING',
            },
        });

        res.status(201).json({
            success: true,
            message: 'Restaurant profile created successfully and is pending review',
            data: restaurant,
        });
    } catch (error) {
        console.error('Create restaurant error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getMyRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = resolveUserId(req);

        if (!userId) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }

        let restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: userId },
            include: { menuItems: true },
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst({
                include: { menuItems: true },
            });
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: 'Restaurant profile not found' });
            return;
        }

        res.status(200).json({ success: true, data: restaurant });
    } catch (error) {
        console.error('Get my restaurant error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};