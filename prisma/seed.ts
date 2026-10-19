import { PrismaClient, Role, RestaurantStatus, PriceRange } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

const RESTAURANT_NAMES = [
    'Izumi Courtyard',
    'Sultan’s Heritage',
    'Madchef Gulshan',
    'The Tavern Dhaka',
    'Kacchi Bhai',
    'Santoor Bistro',
    'Hanoi Saigon',
    'Osteria Bella'
];

const NEIGHBORHOODS = ['Gulshan 1 & 2', 'Banani Avenue', 'Dhanmondi Satmasjid Rd', 'Uttara Sectors', 'Bashundhara R/A'];

// Rich library of distinct global dishes with verified high-speed Unsplash URLs
const GLOBAL_DISH_POOL = [
    { name: "Truffle Infused Wild Mushroom Risotto", category: "european", price: 24.99, image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?q=80&w=800&auto=format&fit=crop" },
    { name: "Authentic Neapolitan Woodfired Margherita Pizza", category: "italian", price: 18.50, image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?q=80&w=800&auto=format&fit=crop" },
    { name: "Pan-Seared Atlantic Salmon with Lemon Herb Butter", category: "european", price: 29.99, image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800&auto=format&fit=crop" },
    { name: "Classic Roman Fettuccine Carbonara", category: "italian", price: 16.99, image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=800&auto=format&fit=crop" },
    { name: "French Beef Bourguignon with Garlic Mash", category: "european", price: 32.50, image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?q=80&w=800&auto=format&fit=crop" },
    { name: "Crispy Golden Calamari with Tartar Sauce", category: "european", price: 14.50, image: "https://images.unsplash.com/photo-1599487488170-d33190226315?q=80&w=800&auto=format&fit=crop" },
    { name: "Slow-Braised Lamb Shank with Rosemary Jus", category: "european", price: 35.00, image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop" },
    { name: "Creamy Lobster Bisque Soup", category: "european", price: 15.99, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop" },
    { name: "Spinach and Ricotta Stuffed Ravioli", category: "italian", price: 17.50, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=800&auto=format&fit=crop" },
    { name: "Classic French Onion Soup with Gruyère", category: "european", price: 12.99, image: "https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=800&auto=format&fit=crop" },
    { name: "Double Smash Burger with Cheddar & Bacon", category: "burger", price: 15.99, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop" },
    { name: "Texas-Style Hickory Smoked BBQ Pork Ribs", category: "american", price: 28.99, image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop" },
    { name: "New York Strip Steak with Peppercorn Sauce", category: "american", price: 38.50, image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?q=80&w=800&auto=format&fit=crop" },
    { name: "Crispy Southern Fried Chicken Wings Bucket", category: "american", price: 16.50, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?q=80&w=800&auto=format&fit=crop" },
    { name: "Classic Chicago Deep Dish Pepperoni Pizza", category: "american", price: 22.00, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop" },
    { name: "Loaded Truffle Fries with Parmesan Dust", category: "american", price: 9.99, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=800&auto=format&fit=crop" },
    { name: "New England Clam Chowder in Sourdough Bowl", category: "american", price: 14.99, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?q=80&w=800&auto=format&fit=crop" },
    { name: "Buffalo Chicken Wrap with Blue Cheese Dressing", category: "american", price: 13.50, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=800&auto=format&fit=crop" },
    { name: "Traditional American Macaroni and Cheese", category: "american", price: 11.99, image: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=800&auto=format&fit=crop" },
    { name: "Smoky Pulled Pork Burger with Slaw", category: "burger", price: 16.50, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?q=80&w=800&auto=format&fit=crop" },
    { name: "Authentic Tokyo Tonkotsu Ramen with Chashu", category: "japanese", price: 18.99, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=800&auto=format&fit=crop" },
    { name: "Dragon Eye Crispy Ebi Tempura Sushi Roll", category: "japanese", price: 22.00, image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?q=80&w=800&auto=format&fit=crop" },
    { name: "Sichuan Kung Pao Chicken with Cashew Nuts", category: "chinese", price: 17.50, image: "https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=800&auto=format&fit=crop" },
    { name: "Bangkok Spicy Basil Minced Beef Rice Bowl", category: "asian", price: 16.00, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=800&auto=format&fit=crop" },
    { name: "Japanese Salmon Sashimi Platter (5pcs)", category: "japanese", price: 26.50, image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=800&auto=format&fit=crop" },
    { name: "Traditional Cantonese Steamed Shrimp Dumplings", category: "chinese", price: 13.99, image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?q=80&w=800&auto=format&fit=crop" },
    { name: "Korean Gochujang Sticky Fried Chicken", category: "asian", price: 17.99, image: "https://images.unsplash.com/photo-1562967914-608f82629710?q=80&w=800&auto=format&fit=crop" },
    { name: "Vietnamese Beef Pho Noodle Soup", category: "asian", price: 19.50, image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?q=80&w=800&auto=format&fit=crop" },
    { name: "Wok-Fried Beef Chow Mein Noodles", category: "chinese", price: 15.50, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=800&auto=format&fit=crop" },
    { name: "Spicy Tuna Volcano Maki Roll", category: "japanese", price: 21.00, image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop" },
    { name: "Royal Shahi Kacchi Mutton Biryani Platter", category: "desi", price: 16.50, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=800&auto=format&fit=crop" },
    { name: "Tandoori Chicken Full Platter with Mint Chutney", category: "desi", price: 21.00, image: "https://images.unsplash.com/photo-1599487488170-d33190226315?q=80&w=800&auto=format&fit=crop" },
    { name: "Creamy Butter Chicken Masala with Garlic Naan", category: "desi", price: 19.50, image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?q=80&w=800&auto=format&fit=crop" },
    { name: "Hyderabadi Special Chicken Dum Biryani", category: "desi", price: 14.50, image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?q=80&w=800&auto=format&fit=crop" },
    { name: "Mughlai Beef Tehari Special", category: "desi", price: 12.99, image: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?q=80&w=800&auto=format&fit=crop" },
    { name: "Spicy Grilled Prawn Malai Curry", category: "desi", price: 24.00, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?q=80&w=800&auto=format&fit=crop" },
    { name: "Traditional Daal Makhani with Jeera Rice", category: "desi", price: 11.50, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop" },
    { name: "Achari Mutton Boti Kebab", category: "desi", price: 21.50, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=800&auto=format&fit=crop" },
    { name: "Belgian Chocolate Molten Lava Cake", category: "desserts", price: 9.99, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=800&auto=format&fit=crop" },
    { name: "Classic New York Baked Cheesecake", category: "desserts", price: 11.50, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=800&auto=format&fit=crop" },
    { name: "Traditional Italian Tiramisu with Espresso", category: "desserts", price: 12.99, image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?q=80&w=800&auto=format&fit=crop" },
    { name: "French Vanilla Crème Brûlée", category: "desserts", price: 10.99, image: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?q=80&w=800&auto=format&fit=crop" }
];

async function main() {
    console.log('🌱 Seeding database...');

    const superAdminPasswordHash = await bcrypt.hash(env.SUPERADMIN_PASSWORD, 10);
    const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    const vendorPasswordHash = await bcrypt.hash('vendor12345', 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: env.SUPERADMIN_EMAIL },
        update: {},
        create: {
            name: 'Super Admin',
            email: env.SUPERADMIN_EMAIL,
            passwordHash: superAdminPasswordHash,
            role: Role.SUPERADMIN,
            phone: '+8801000000000',
        },
    });

    const admin = await prisma.user.upsert({
        where: { email: env.ADMIN_EMAIL },
        update: {},
        create: {
            name: 'Platform Admin',
            email: env.ADMIN_EMAIL,
            passwordHash: adminPasswordHash,
            role: Role.ADMIN,
            phone: '+8801000000001',
        },
    });

    await prisma.platformSetting.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            commissionPercent: 10.0,
            listingFee: 20.0,
            maintenanceMode: false,
        },
    });

    const vendorUser = await prisma.user.upsert({
        where: { email: 'vendor@dinedesk.com' },
        update: {},
        create: {
            name: 'Master Vendor',
            email: 'vendor@dinedesk.com',
            passwordHash: vendorPasswordHash,
            role: Role.VENDOR,
            phone: '+8801500000000',
        },
    });

    const restaurant = await prisma.restaurant.upsert({
        where: { ownerId: vendorUser.id },
        update: {},
        create: {
            ownerId: vendorUser.id,
            name: 'DineDesk Flagship Central Kitchen',
            description: 'Central kitchen housing multi-cuisine partner menus across Dhaka.',
            cuisine: 'Multi-Cuisine',
            address: 'Gulshan Avenue, Dhaka',
            opensAt: '09:00',
            closesAt: '23:59',
            status: RestaurantStatus.PUBLISHED,
            isFeatured: true,
            priceRange: PriceRange.MEDIUM,
            avgRating: 4.9,
            reviewCount: 1450,
        },
    });

    await prisma.menuItem.deleteMany({});
    console.log('📦 Generating exactly 400 sequential, unique menu items...');

    const menuItemsData = [];
    for (let i = 1; i <= 400; i++) {
        const baseDish = GLOBAL_DISH_POOL[(i - 1) % GLOBAL_DISH_POOL.length];

        // Strictly sequential item name like Menu Item #1, Menu Item #2 ... #400
        const sequentialName = `Menu Item #${i}: ${baseDish.name}`;

        const neighborhood = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
        const restName = RESTAURANT_NAMES[i % RESTAURANT_NAMES.length];
        const calculatedPrice = Number((baseDish.price + (i % 4) * 0.5).toFixed(2));

        menuItemsData.push({
            restaurantId: restaurant.id,
            menuName: sequentialName,
            cuisineCategory: baseDish.category,
            priceTier: calculatedPrice > 25 ? "$$$" : calculatedPrice > 15 ? "$$" : "$",
            rating: Number((4.5 + (i % 5) * 0.1).toFixed(1)),
            reviewCount: 30 + ((i * 7) % 300),
            restaurantName: restName,
            deliveryTime: `${20 + (i % 20)} mins`,
            deliveryFee: 5.00, // Standard $5 delivery fee
            image: baseDish.image,
            imageAlt: sequentialName,
            badge: i <= 6 ? "Featured Top Pick" : i % 15 === 0 ? "Chef's Special" : null,
            neighborhood: neighborhood,
            isOpen: true,
            isHalal: true,
            isVegetarianFriendly: i % 4 === 0,
            isKidFriendly: true,
            isDineIn: true,
            isDelivery: true,
            featured: i <= 6,
            name: sequentialName,
            description: `Authentic and delicious ${baseDish.category} specialty #${i} prepared with premium ingredients.`,
            price: calculatedPrice,
            category: baseDish.category === 'desserts' ? 'Desserts' : baseDish.category === 'desi' ? 'Desi & Biryani' : 'Mains',
            imageUrl: baseDish.image,
            isAvailable: true,
            isPublished: true,
            soldCount: 20 + ((i * 5) % 400),
        });
    }

    for (let j = 0; j < menuItemsData.length; j += 100) {
        const batch = menuItemsData.slice(j, j + 100);
        await prisma.menuItem.createMany({ data: batch });
        console.log(`Inserted batch ${j / 100 + 1} (Items ${j + 1} to ${j + batch.length})`);
    }

    console.log('✅ Seeding completed with 400 sequential items!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });