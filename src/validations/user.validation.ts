import { z } from "zod";

export const updateProfileSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters long."),
    email: z.string().email("Invalid email address."),
    phone: z.string().optional().nullable(),
    avatarUrl: z.string().url("Invalid avatar URL.").optional().nullable(),
    language: z.string().default("en"),
    dietaryPreferences: z.array(z.enum(["halal_only", "nut_allergy", "mild_spice", "no_shellfish"])).optional(),
});