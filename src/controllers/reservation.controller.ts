// src/controllers/reservation.controller.ts
import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import jwt from "jsonwebtoken";

// Helper to parse cookies manually if cookie-parser is missing on serverless
function parseCookie(cookieHeader: string, name: string): string | null {
    const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? (match[2] || null) : null;
}

// Get all customer reservations
export const getCustomerReservations = async (req: Request, res: Response): Promise<void> => {
    try {
        let userId = (req as any).user?.id || (req as any).user?.userId;

        if (!userId) {
            const authHeader = req.headers.authorization;
            const token =
                (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
                authHeader ||
                (req as any).cookies?.token ||
                (req as any).cookies?.accessToken ||
                (req.headers.cookie ? parseCookie(req.headers.cookie, "token") : null);

            if (token) {
                try {
                    const secret = process.env.JWT_SECRET || "super secret jwt key change this";
                    const decoded: any = jwt.verify(token, secret);
                    userId = decoded.id || decoded.userId || decoded._id;
                } catch (err: any) {
                    console.error("JWT Verification Error on Vercel:", err.message);
                }
            }
        }

        if (!userId) {
            console.warn("Unauthorized access attempt to getCustomerReservations. Headers:", req.headers);
            res.status(401).json({ success: false, message: "Unauthorized: No valid user session found" });
            return;
        }

        const reservations = await prisma.reservation.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({ success: true, reservations });
    } catch (error: any) {
        console.error("Get reservations server error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new reservation
export const createReservation = async (req: Request, res: Response): Promise<void> => {
    try {
        let userId = (req as any).user?.id || (req as any).user?.userId;

        if (!userId) {
            const authHeader = req.headers.authorization;
            const token = (authHeader && authHeader.split(" ")[1]) || (req as any).cookies?.token;
            if (token) {
                try {
                    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "super secret jwt key change this");
                    userId = decoded.id || decoded.userId;
                } catch (e) { }
            }
        }

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized: No user ID found on request" });
            return;
        }

        const body = req.body || {};
        const {
            restaurantId,
            restaurantName,
            restaurantImage,
            neighborhood,
            fullAddress,
            cuisine,
            date,
            displayDate,
            time,
            mealPeriod,
            partySize,
            seatingArea,
            tableNumber,
            specialNotes,
        } = body;

        let targetRestaurantId = restaurantId || "restaurant-1";
        const restaurant = await prisma.restaurant.findUnique({
            where: { id: targetRestaurantId },
        }).catch(() => null);

        if (!restaurant) {
            const firstRest = await prisma.restaurant.findFirst();
            if (firstRest) {
                targetRestaurantId = firstRest.id;
            }
        }

        const newReservation = await prisma.reservation.create({
            data: {
                userId,
                restaurantId: targetRestaurantId,
                restaurantName: restaurantName || restaurant?.name || "Partner Restaurant",
                restaurantImage: restaurantImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
                neighborhood: neighborhood || "Downtown",
                fullAddress: fullAddress || "Global City",
                cuisine: cuisine || "Fine Dining",
                date: date || new Date().toISOString().split("T")[0],
                displayDate: displayDate || "Today",
                time: time || "07:30 PM",
                mealPeriod: mealPeriod || "Dinner",
                partySize: Number(partySize) || 2,
                seatingArea: seatingArea || "Main Dining Hall",
                tableNumber: String(tableNumber || "1"),
                status: "CONFIRMED",
                statusDisplay: "Confirmed",
                specialNotes: specialNotes || "",
                isFeaturedUpcoming: true,
            },
        });

        res.status(201).json({
            success: true,
            message: "Table reserved successfully in database!",
            reservation: newReservation,
        });
    } catch (error: any) {
        console.error("Prisma Reservation Creation Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update or Cancel reservation
export const updateReservationStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        let userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) {
            const authHeader = req.headers.authorization;
            const token =
                (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
                authHeader ||
                (req as any).cookies?.token ||
                (req as any).cookies?.accessToken ||
                (req.headers.cookie ? parseCookie(req.headers.cookie, "token") : null);

            if (token) {
                try {
                    const secret = process.env.JWT_SECRET || "super secret jwt key change this";
                    const decoded: any = jwt.verify(token, secret);
                    userId = decoded.id || decoded.userId || decoded._id;
                } catch (e) { }
            }
        }

        const id = String(req.params.id);
        const { status, statusDisplay, specialNotes, partySize, date, time } = req.body || {};

        const reservation = await prisma.reservation.findUnique({ where: { id } });
        if (!reservation) {
            res.status(404).json({ success: false, message: "Reservation not found" });
            return;
        }

        const updated = await prisma.reservation.update({
            where: { id },
            data: {
                status: status || reservation.status,
                statusDisplay: statusDisplay || reservation.statusDisplay,
                specialNotes: specialNotes !== undefined ? specialNotes : reservation.specialNotes,
                partySize: partySize ? Number(partySize) : undefined,
                date: date || reservation.date,
                time: time || reservation.time,
            },
        });

        res.status(200).json({ success: true, message: "Reservation updated successfully", reservation: updated });
    } catch (error: any) {
        console.error("Update reservation error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// VENDOR TABLE HOLDS (WITH FALLBACK)
// ==========================================

export const getVendorHolds = async (req: Request, res: Response): Promise<void> => {
    try {
        let userId = (req as any).user?.id || (req as any).user?.userId;

        if (!userId) {
            const authHeader = req.headers.authorization;
            const token =
                (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
                authHeader ||
                (req as any).cookies?.token ||
                (req as any).cookies?.accessToken ||
                (req.headers.cookie ? parseCookie(req.headers.cookie, "token") : null);

            if (token) {
                try {
                    const secret = process.env.JWT_SECRET || "super secret jwt key change this";
                    const decoded: any = jwt.verify(token, secret);
                    userId = decoded.id || decoded.userId || decoded._id;
                } catch (err: any) {
                    console.error("JWT Verification Error:", err.message);
                }
            }
        }

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized: No valid user session found" });
            return;
        }

        // 1. Locate restaurant by ownerId, fallback to first available
        let restaurant = await prisma.restaurant.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!restaurant) {
            restaurant = await prisma.restaurant.findFirst({
                select: { id: true },
            });
        }

        if (!restaurant) {
            res.status(404).json({ success: false, message: "No restaurant profile associated with this vendor account" });
            return;
        }

        // 2. Fetch active reservations
        const holds = await prisma.reservation.findMany({
            where: {
                restaurantId: restaurant.id,
                status: { in: ["PENDING", "CONFIRMED"] },
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
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        res.status(200).json({ success: true, data: holds });
    } catch (error: any) {
        console.error("Get vendor reservations server error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};