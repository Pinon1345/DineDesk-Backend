// src/validations/user.validation.ts
import { z } from "zod";

export const updateProfileSchema = z.object({
    body: z.object({
        fullName: z
            .string()
            .trim()
            .min(2, "Full name must be at least 2 characters long.")
            .optional(),

        name: z
            .string()
            .trim()
            .min(2, "Name must be at least 2 characters long.")
            .optional(),

        email: z
            .string()
            .trim()
            .email("Invalid email address.")
            .optional()
            .or(z.literal("")),

        phone: z
            .preprocess(
                (val) => (typeof val === "string" && val.trim() === "" ? null : val),
                z.string().nullable().optional()
            ),

        avatarUrl: z
            .preprocess(
                (val) => (typeof val === "string" && val.trim() === "" ? null : val),
                z.string().nullable().optional()
            ),

        image: z
            .preprocess(
                (val) => (typeof val === "string" && val.trim() === "" ? null : val),
                z.string().nullable().optional()
            ),

        language: z.string().trim().optional().default("en"),

        dietaryPreferences: z
            .array(z.enum(["halal_only", "nut_allergy", "mild_spice", "no_shellfish"]))
            .optional()
            .default([]),
    }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;