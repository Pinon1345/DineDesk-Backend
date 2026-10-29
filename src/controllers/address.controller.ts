import { Request, Response } from "express";
import { prisma } from "../config/db.js";


// Helper to extract authenticated user ID
const getAuthUserId = (req: any): string | null => {
    return (
        req.user?.id ||
        req.userId ||
        req.session?.user?.id ||
        req.session?.userId ||
        null
    );
};

// GET /api/v1/users/addresses
export const getAddresses = async (req: Request, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const addresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return res.status(200).json({
            success: true,
            data: addresses,
        });
    } catch (error: any) {
        console.error("Error fetching addresses:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/v1/users/addresses
export const createAddress = async (req: Request, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const {
            label,
            recipientName,
            contactNumber,
            category,
            building,
            road,
            apartment,
            city,
            postalCode,
            deliveryInstructions,
            isDefault,
        } = req.body;

        const existingCount = await prisma.address.count({ where: { userId } });
        const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

        if (shouldBeDefault) {
            await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        const addressLineText = [building, road, apartment, city]
            .filter(Boolean)
            .join(", ");

        const newAddress = await prisma.address.create({
            data: {
                userId,
                label: label || "Home",
                recipientName: recipientName || null,
                contactNumber: contactNumber || null,
                category: category || "home",
                building: building || null,
                road: road || null,
                apartment: apartment || null,
                city: city || null,
                postalCode: postalCode || null,
                deliveryInstructions: deliveryInstructions || null,
                addressLine: addressLineText || "Address",
                isDefault: shouldBeDefault,
            },
        });

        const allAddresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return res.status(201).json({
            success: true,
            data: allAddresses,
            address: newAddress,
        });
    } catch (error: any) {
        console.error("Error creating address:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/v1/users/addresses/:id
export const updateAddress = async (req: Request, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        const id = req.params.id as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: "Address ID is required" });
        }

        const {
            label,
            recipientName,
            contactNumber,
            category,
            building,
            road,
            apartment,
            city,
            postalCode,
            deliveryInstructions,
            isDefault,
        } = req.body;

        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false },
            });
        }

        const addressLineText = [building, road, apartment, city]
            .filter(Boolean)
            .join(", ");

        await prisma.address.update({
            where: { id },
            data: {
                label,
                recipientName,
                contactNumber,
                category,
                building,
                road,
                apartment,
                city,
                postalCode,
                deliveryInstructions,
                ...(addressLineText ? { addressLine: addressLineText } : {}),
                ...(typeof isDefault === "boolean" ? { isDefault } : {}),
            },
        });

        const allAddresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return res.status(200).json({
            success: true,
            data: allAddresses,
        });
    } catch (error: any) {
        console.error("Error updating address:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/v1/users/addresses/:id/default
export const setDefaultAddress = async (req: Request, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        const id = req.params.id as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: "Address ID is required" });
        }

        // Set all user addresses to not default
        await prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false },
        });

        // Mark target address as default
        await prisma.address.update({
            where: { id },
            data: { isDefault: true },
        });

        const allAddresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return res.status(200).json({
            success: true,
            data: allAddresses,
        });
    } catch (error: any) {
        console.error("Error setting default address:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/v1/users/addresses/:id
export const deleteAddress = async (req: Request, res: Response) => {
    try {
        const userId = getAuthUserId(req);
        const id = req.params.id as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!id) {
            return res.status(400).json({ success: false, message: "Address ID is required" });
        }

        const deleted = await prisma.address.delete({
            where: { id },
        });

        // If default address was deleted, promote the newest address to default
        if (deleted.isDefault) {
            const remaining = await prisma.address.findFirst({
                where: { userId },
                orderBy: { createdAt: "desc" },
            });
            if (remaining) {
                await prisma.address.update({
                    where: { id: remaining.id },
                    data: { isDefault: true },
                });
            }
        }

        const allAddresses = await prisma.address.findMany({
            where: { userId },
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        });

        return res.status(200).json({
            success: true,
            data: allAddresses,
        });
    } catch (error: any) {
        console.error("Error deleting address:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};