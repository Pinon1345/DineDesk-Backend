// src/controllers/user.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
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
                passwordHash: true,
                createdAt: true,
            },
        });

        if (!user) {
            res.status(404).json({ success: false, message: "User not found in database" });
            return;
        }

        const resolvedAvatar = user.avatarUrl || null;
        const hasPassword = Boolean(user.passwordHash);

        res.status(200).json({
            success: true,
            user: {
                ...user,
                hasPassword,
                passwordHash: undefined,
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
                passwordHash: true,
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
                hasPassword: Boolean(updatedUser.passwordHash),
                passwordHash: undefined,
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

// 3. PATCH Change / Set Password
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user?.id || (req as any).user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized: No active session found." });
            return;
        }

        const { currentPassword, newPassword, confirmPassword } = req.body || {};

        if (!newPassword) {
            res.status(400).json({
                success: false,
                message: "Please provide a new password.",
            });
            return;
        }

        if (newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters long.",
            });
            return;
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            res.status(400).json({
                success: false,
                message: "New password and confirm password do not match.",
            });
            return;
        }

        // 1. Fetch user to verify whether a password is already set
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User account record not found.",
            });
            return;
        }

        // 2. If user already has a password (Standard Sign-Up), enforce current password validation
        if (user.passwordHash) {
            if (!currentPassword) {
                res.status(400).json({
                    success: false,
                    message: "Please provide your current password to authorize this change.",
                });
                return;
            }

            const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!isMatch) {
                res.status(400).json({
                    success: false,
                    message: "Current password does not match. Please verify and try again.",
                });
                return;
            }

            const isSame = await bcrypt.compare(newPassword, user.passwordHash);
            if (isSame) {
                res.status(400).json({
                    success: false,
                    message: "New password cannot be the same as your current password.",
                });
                return;
            }
        }

        // 3. Hash new password and save to PostgreSQL
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        res.status(200).json({
            success: true,
            hasPassword: true,
            message: user.passwordHash
                ? "Password updated successfully."
                : "Password created successfully! You can now sign in using your email and password.",
        });
    } catch (error: any) {
        console.error("Change password controller error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "An unexpected error occurred while saving password.",
        });
    }
};