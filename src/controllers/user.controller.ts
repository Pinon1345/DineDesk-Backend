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

        const resolvedAvatar = user.avatarUrl || null;

        res.status(200).json({
            success: true,
            user: {
                ...user,
                avatarUrl: resolvedAvatar,
                image: resolvedAvatar,
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
            res.status(401).json({ success: false, message: "Unauthorized: No user session found" });
            return;
        }

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!currentUser) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        const bodyData = req.body && req.body.body ? req.body.body : req.body;

        const {
            name,
            fullName,
            email,
            phone,
            avatarUrl,
            image,
            resetAvatar,
            language,
            dietaryPreferences,
        } = bodyData || {};

        const resolvedName = String(fullName || name || "").trim();
        const resolvedEmail =
            email !== undefined && email !== null && String(email).trim() !== ""
                ? String(email).trim().toLowerCase()
                : undefined;

        const incomingAvatar = avatarUrl !== undefined ? avatarUrl : image;

        const updateData: Record<string, any> = {};

        if (resolvedName) {
            updateData.name = resolvedName;
        }

        // Handle email change with uniqueness validation
        if (resolvedEmail && resolvedEmail !== currentUser.email.toLowerCase()) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: resolvedEmail,
                    NOT: { id: userId },
                },
            });

            if (existingUser) {
                res.status(400).json({
                    success: false,
                    message: "This email is already in use by another account.",
                });
                return;
            }

            updateData.email = resolvedEmail;
        }

        if (phone !== undefined) {
            updateData.phone = phone && String(phone).trim() !== "" ? String(phone).trim() : null;
        }

        // SAFE AVATAR UPDATE:
        // Only update avatarUrl if it's a valid HTTP string or if explicitly resetting
        if (resetAvatar === true) {
            updateData.avatarUrl = null;
        } else if (typeof incomingAvatar === "string" && incomingAvatar.trim().startsWith("http")) {
            updateData.avatarUrl = incomingAvatar.trim();
        }
        // If incomingAvatar is undefined, null, or empty string, LEAVE the existing currentUser.avatarUrl in the DB!

        if (language) {
            updateData.language = String(language).trim();
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
                createdAt: true,
                updatedAt: true,
            },
        });

        const finalAvatar = updatedUser.avatarUrl || null;

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                ...updatedUser,
                avatarUrl: finalAvatar,
                image: finalAvatar,
                fullName: updatedUser.name,
            },
        });
    } catch (error: any) {
        console.error("Update profile error:", error);

        if (error.code === "P2002") {
            res.status(400).json({
                success: false,
                message: "This email is already in use by another account.",
            });
            return;
        }

        res.status(500).json({
            success: false,
            message: error.message || "Failed to update profile",
        });
    }
};