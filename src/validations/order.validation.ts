// src/validations/order.validation.ts
import { z } from 'zod';

export const createOrderSchema = z.object({
    body: z.object({
        orderType: z.enum(['DELIVERY', 'PICKUP', 'DINE_IN']),
        paymentMethod: z.enum(['STRIPE', 'COD']),
        deliveryAddress: z.string().optional(),
        deliveryLat: z.number().optional(),
        deliveryLng: z.number().optional(),
        couponCode: z.string().optional(),
    }),
});