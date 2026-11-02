import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import {
    createReservation,
    getCustomerReservations,
    updateReservationStatus,
    getVendorHolds,
    getVendorFloorTables,
    updateFloorTableStatus,
} from "../controllers/reservation.controller.js";
import { createReservationSchema } from "../validations/social.validation.js";
import { updateReservationSchema } from "../validations/reservation.validation.js";

const router = Router();

// Apply global authentication across reservation endpoints
router.use(authenticate);

// ==========================================
// VENDOR TABLE HOLDS (Live Dashboard Queue)
// ==========================================
router.get("/vendor/holds", getVendorHolds);

// ==========================================
// VENDOR FLOOR MATRIX & DYNAMIC TABLES
// ==========================================
router.get("/vendor/floor-tables", getVendorFloorTables);
router.patch("/vendor/floor-tables/:tableNumber/status", updateFloorTableStatus);
router.patch("/vendor/:id/status", updateReservationStatus);

// ==========================================
// CUSTOMER RESERVATIONS
// ==========================================
router.get("/", getCustomerReservations);
router.post("/", validate(createReservationSchema), createReservation);
router.put("/:id", validate(updateReservationSchema), updateReservationStatus);
router.patch("/:id", validate(updateReservationSchema), updateReservationStatus);

export default router;