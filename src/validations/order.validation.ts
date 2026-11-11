// src/validations/order.validation.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
    body: z.object({
        orderType: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
        paymentMethod: z.enum(['STRIPE', 'COD']),
        deliveryAddress: z.string().optional(),
        deliveryLat: z.number().optional().nullable(),
        deliveryLng: z.number().optional().nullable(),
        deliveryDetails: z.any().optional(),
        deliveryInstructions: z.string().optional().nullable(),
        recipientName: z.string().optional().nullable(),
        recipientPhone: z.string().optional().nullable(),
        couponCode: z.string().optional(),
        items: z.array(z.any()).optional(),
    }),
});
