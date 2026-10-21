import { Router } from "express";

import { authenticate } from "../middlewares/authenticate.js";
import { updateProfileSchema } from "../validations/user.validation.js";
import { validate } from "../middlewares/validate.js";
import { getUserProfile, updateUserProfile } from "../controllers/user.controller.js";

const router = Router();

router.get("/profile", authenticate, getUserProfile);
router.put("/profile", authenticate, validate(updateProfileSchema), updateUserProfile);

export default router;