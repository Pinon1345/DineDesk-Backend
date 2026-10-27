// src/controllers/user.controller.ts
import { Request, Response } from "express";
import { prisma } from "../config/db.js";

// 1. GET User Profile from PostgreSQL
export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized: No user ID found" });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                language: true,
                dietaryPreferences: true,
                loyaltyPoints: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, message: "User not found in database" });
            return;
        }

        res.status(200).json({
            success: true,
            user: {
                ...user,
                fullName: user.name,
            },
        });
    } catch (error: any) {
        console.error("Get user profile error:", error);
        res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
};

// 2. PUT / PATCH Update User Profile in PostgreSQL
export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const {
            name,
            fullName,
            phone,
            avatarUrl,
            language,
            dietaryPreferences,
        } = req.body;

        const resolvedName = (fullName || name || "").trim();

        // Build selective update object so existing fields aren't wiped with undefined/null
        const updateData: Record<string, any> = {};

        if (resolvedName) {
            updateData.name = resolvedName;
        }
        if (phone !== undefined) {
            updateData.phone = phone ? String(phone).trim() : null;
        }
        if (avatarUrl !== undefined) {
            updateData.avatarUrl = avatarUrl;
        }
        if (language) {
            updateData.language = language;
        }
        if (Array.isArray(dietaryPreferences)) {
            updateData.dietaryPreferences = dietaryPreferences;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatarUrl: true,
                language: true,
                dietaryPreferences: true,
                loyaltyPoints: true,
                role: true,
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
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: error.message || "Failed to update profile" });
    }
};