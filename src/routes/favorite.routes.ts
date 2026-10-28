import { Router } from "express";
import {
    getUserFavorites,
    addFavorite,
    removeFavorite,
    saveMenu,
    unsaveMenu,
} from "../controllers/favorite.controller.js";
import { authenticate } from "../middlewares/authenticate.js";

const router = Router();

// Apply authentication middleware to all favorite routes
router.use(authenticate);

router.get("/", getUserFavorites);
router.post("/save/:menuId", saveMenu);
router.delete("/save/:menuId", unsaveMenu);
router.post("/:menuId", addFavorite);
router.delete("/:menuId", removeFavorite);

export default router;