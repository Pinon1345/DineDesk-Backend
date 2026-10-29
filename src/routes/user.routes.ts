import { Router } from "express";

import { authenticate } from "../middlewares/authenticate.js";
import { updateProfileSchema } from "../validations/user.validation.js";
import { validate } from "../middlewares/validate.js";
import { getUserProfile, updateUserProfile } from "../controllers/user.controller.js";
import {
    getAddresses,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
} from "../controllers/address.controller.js";

const router = Router();

// Profile Endpoints
router.get("/profile", authenticate, getUserProfile);
router.put("/profile", authenticate, validate(updateProfileSchema), updateUserProfile);

// Address Management Endpoints (/api/v1/users/addresses)
router.get("/addresses", authenticate, getAddresses);
router.post("/addresses", authenticate, createAddress);
router.put("/addresses/:id", authenticate, updateAddress);
router.patch("/addresses/:id/default", authenticate, setDefaultAddress);
router.delete("/addresses/:id", authenticate, deleteAddress);

export default router;