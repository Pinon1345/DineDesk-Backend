import { z } from "zod";

export const createReservationSchema = z.object({
    restaurantId: z.string().min(1, "Restaurant ID is required"),
    restaurantName: z.string().min(1, "Restaurant name is required"),
    restaurantImage: z.string().optional(),
    neighborhood: z.string().optional(),
    fullAddress: z.string().optional(),
    cuisine: z.string().optional(),
    date: z.string().min(1, "Date is required"),
    displayDate: z.string().min(1, "Display date is required"),
    time: z.string().min(1, "Time is required"),
    mealPeriod: z.string().default("Dinner"),
    partySize: z.number().min(1, "Party size must be at least 1"),
    seatingArea: z.string().default("Main Dining Hall"),
    tableNumber: z.string().optional(),
    specialNotes: z.string().optional(),
});

export const updateReservationSchema = createReservationSchema.partial().extend({
    status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "DECLINED", "REJECTED"]).optional(),
    statusDisplay: z.string().optional(),
});