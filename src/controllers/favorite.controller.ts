import { Request, Response } from "express";
import { prisma } from "../config/db.js";


// GET /api/v1/favorites
export const getUserFavorites = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const records = await prisma.favorite.findMany({
            where: {
                userId,
                OR: [{ isFavorite: true }, { isSaved: true }],
            },
            include: {
                menuItem: {
                    include: {
                        restaurant: {
                            select: {
                                id: true,
                                name: true,
                                coverUrl: true,
                                address: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const menus = records
            .filter((r: any) => r.menuItem)
            .map((r: any) => ({
                id: r.menuItem.id,
                name: r.menuItem.menuName || r.menuItem.name,
                restaurantName:
                    r.menuItem.restaurantName ||
                    r.menuItem.restaurant?.name ||
                    "Restaurant",
                restaurantId: r.menuItem.restaurantId || r.menuItem.restaurant?.id || "",
                price: Number(r.menuItem.price || 0),
                description: r.menuItem.description || "",
                image: r.menuItem.image || r.menuItem.imageUrl || "",
                imageAlt: r.menuItem.imageAlt || r.menuItem.menuName || r.menuItem.name,
                cuisineCategory: r.menuItem.cuisineCategory || "all",
                neighborhood: r.menuItem.neighborhood || r.menuItem.restaurant?.address || "",
                rating: Number(r.menuItem.rating || 5),
                isSaved: Boolean(r.isSaved),
                isFavorite: Boolean(r.isFavorite),
            }));

        return res.status(200).json({
            success: true,
            data: menus,
            menus,
            total: menus.length,
        });
    } catch (error: any) {
        console.error("Get favorites error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /api/v1/favorites/:menuId (Toggle / Add Favorite)
export const addFavorite = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const menuId = String(req.params.menuId);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const record = await prisma.favorite.upsert({
            where: {
                userId_menuItemId: { userId, menuItemId: menuId },
            },
            update: { isFavorite: true },
            create: { userId, menuItemId: menuId, isFavorite: true, isSaved: false },
        });

        return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
        console.error("Add favorite error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// DELETE /api/v1/favorites/:menuId (Remove Favorite)
export const removeFavorite = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const menuId = String(req.params.menuId);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const record = await prisma.favorite.updateMany({
            where: { userId, menuItemId: menuId },
            data: { isFavorite: false },
        });

        return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
        console.error("Remove favorite error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// POST /api/v1/favorites/save/:menuId (Save Menu for later)
export const saveMenu = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const menuId = String(req.params.menuId);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const record = await prisma.favorite.upsert({
            where: {
                userId_menuItemId: { userId, menuItemId: menuId },
            },
            update: { isSaved: true },
            create: { userId, menuItemId: menuId, isFavorite: false, isSaved: true },
        });

        return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
        console.error("Save menu error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// DELETE /api/v1/favorites/save/:menuId (Unsave Menu)
export const unsaveMenu = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const menuId = String(req.params.menuId);

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const record = await prisma.favorite.updateMany({
            where: { userId, menuItemId: menuId },
            data: { isSaved: false },
        });

        return res.status(200).json({ success: true, data: record });
    } catch (error: any) {
        console.error("Unsave menu error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};