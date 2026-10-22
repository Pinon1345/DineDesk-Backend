import { Router } from "express";
import { authenticate } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { createReservation, getCustomerReservations, updateReservationStatus } from "../controllers/reservation.controller.js";
import { createReservationSchema } from "../validations/social.validation.js";
import { updateReservationSchema } from "../validations/reservation.validation.js";


const router = Router();

router.get("/", authenticate, getCustomerReservations);
router.post("/", authenticate, validate(createReservationSchema), createReservation);
router.put("/:id", authenticate, validate(updateReservationSchema), updateReservationStatus);

export default router;