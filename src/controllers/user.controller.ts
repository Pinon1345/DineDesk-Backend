import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Get Customer Profile
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        // Assuming authentication middleware attaches user id to req.user
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                avatarUrl: true,
                language: true,
                dietaryPreferences: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        res.status(200).json({ success: true, user });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Customer Profile
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const { fullName, email, phone, avatarUrl, language, dietaryPreferences } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                fullName,
                email,
                phone,
                avatarUrl,
                language,
                dietaryPreferences,
            },
        });

        res.status(200).json({
            success: true,
            message: "Profile updated successfully in database",
            user: updatedUser,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};