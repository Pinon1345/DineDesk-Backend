// src/routes/social.routes.ts
import { Router } from 'express';
import {
    createReservation,
    getMyReservations,
    createReview,
} from '../controllers/social.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { createReservationSchema, createReviewSchema } from '../validations/social.validation.js';

const router = Router();

router.use(authenticate);

router.post('/reservations', validate(createReservationSchema), createReservation);
router.get('/reservations/my', getMyReservations);
router.post('/reviews', validate(createReviewSchema), createReview);

export default router;