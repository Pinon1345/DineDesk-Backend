import { Request, Response } from "express";
import { prisma } from "../config/db.js";
import jwt from "jsonwebtoken";

// Get all customer reservations
export const getCustomerReservations = async (req: Request, res: Response): Promise<void> => {
    try {
        let userId = (req as any).user?.id || (req as any).user?.userId;

        // Fallback: Safely decode token from Authorization header or cookies
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

// Helper to parse cookies manually if cookie-parser is missing on serverless
function parseCookie(cookieHeader: string, name: string): string | null {
    const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? (match[2] || null) : null;
}

// Create a new reservation (Fully preserved)
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
            reservedFor,
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
            const token = (authHeader && authHeader.split(" ")[1]) || (req as any).cookies?.token;
            if (token) {
                try {
                    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || "super secret jwt key change this");
                    userId = decoded.id || decoded.userId;
                } catch (e) { }
            }
        }

        const id = String(req.params.id);
        const { status, statusDisplay, specialNotes, partySize, date, time } = req.body || {};

        const reservation = await prisma.reservation.findUnique({ where: { id } });
        if (!reservation || reservation.userId !== userId) {
            res.status(404).json({ success: false, message: "Reservation not found" });
            return;
        }

        const updated = await prisma.reservation.update({
            where: { id },
            data: {
                status,
                statusDisplay,
                specialNotes,
                partySize: partySize ? Number(partySize) : undefined,
                date,
                time,
            },
        });

        res.status(200).json({ success: true, message: "Reservation updated successfully", reservation: updated });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};