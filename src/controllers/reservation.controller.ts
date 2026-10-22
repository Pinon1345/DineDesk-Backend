import { Request, Response } from "express"; // Adjust based on where your prisma/db instance is exported
import { prisma } from "../config/db.js";

// Get all customer reservations
export const getCustomerReservations = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const reservations = await prisma.reservation.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({ success: true, reservations });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create a new reservation
export const createReservation = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id || (req as any).user?.userId;
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

        const newReservation = await prisma.reservation.create({
            data: {
                userId,
                restaurantId: restaurantId || "restaurant-1",
                restaurantName: restaurantName || "Partner Restaurant",
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
        const userId = (req as any).user?.id || (req as any).user?.userId;
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