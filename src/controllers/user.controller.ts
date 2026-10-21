import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 1. GET User Profile from PostgreSQL
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id; // Attached by your authenticate middleware
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized: No user ID found" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true, // Map to fullName on frontend if needed
                email: true,
                phone: true,
                avatarUrl: true,
                language: true,
                dietaryPreferences: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, message: "User not found in database" });
            return;
        }

        // Map Prisma 'name' to frontend 'fullName' property expected by TypeScript types
        res.status(200).json({
            success: true,
            user: {
                ...user,
                fullName: user.name,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. PUT Update User Profile in PostgreSQL
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { fullName, email, phone, avatarUrl, language, dietaryPreferences } = req.body;

        // Update the exact user record in PostgreSQL via Prisma
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: fullName, // Stored in the 'name' column of your User model
                email,
                phone,
                avatarUrl,
                language,
                dietaryPreferences,
            },
        });

        res.status(200).json({
            success: true,
            message: "Profile successfully stored in database",
            user: {
                ...updatedUser,
                fullName: updatedUser.name,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};