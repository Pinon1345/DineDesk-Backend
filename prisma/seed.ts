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

// Rich library of distinct global dishes (European, American, Asian, Italian, Japanese, Desi, Desserts)
const GLOBAL_DISH_POOL = [
    { name: "Truffle Infused Wild Mushroom Risotto", category: "european", price: 650, image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9" },
    { name: "Authentic Neapolitan Woodfired Margherita Pizza", category: "italian", price: 580, image: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143" },
    { name: "Pan-Seared Atlantic Salmon with Lemon Herb Butter", category: "european", price: 980, image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2" },
    { name: "Classic Roman Fettuccine Carbonara", category: "italian", price: 620, image: "https://images.unsplash.com/photo-1612874742237-6526221588e3" },
    { name: "French Beef Bourguignon with Garlic Mash", category: "european", price: 1150, image: "https://images.unsplash.com/photo-1534939561126-855b8675edd7" },
    { name: "Crispy Golden Calamari with Tartar Sauce", category: "european", price: 490, image: "https://images.unsplash.com/photo-1599487488170-d33190226315" },
    { name: "Slow-Braised Lamb Shank with Rosemary Jus", category: "european", price: 1250, image: "https://images.unsplash.com/photo-1544025162-d76694265947" },
    { name: "Creamy Lobster Bisque Soup", category: "european", price: 520, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd" },
    { name: "Spinach and Ricotta Stuffed Ravioli", category: "italian", price: 610, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc" },
    { name: "Classic French Onion Soup with Gruyère", category: "european", price: 450, image: "https://images.unsplash.com/photo-1547592180-85f173990554" },
    { name: "Double Smash Burger with Cheddar & Bacon", category: "burger", price: 680, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd" },
    { name: "Texas-Style Hickory Smoked BBQ Pork Ribs", category: "american", price: 1100, image: "https://images.unsplash.com/photo-1544025162-d76694265947" },
    { name: "New York Strip Steak with Peppercorn Sauce", category: "american", price: 1450, image: "https://images.unsplash.com/photo-1600891964599-f61ba0e24092" },
    { name: "Crispy Southern Fried Chicken Wings Bucket", category: "american", price: 550, image: "https://images.unsplash.com/photo-1527477396000-e27163b481c2" },
    { name: "Classic Chicago Deep Dish Pepperoni Pizza", category: "american", price: 850, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591" },
    { name: "Loaded Truffle Fries with Parmesan Dust", category: "american", price: 380, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877" },
    { name: "New England Clam Chowder in Sourdough Bowl", category: "american", price: 590, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd" },
    { name: "Buffalo Chicken Wrap with Blue Cheese Dressing", category: "american", price: 480, image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af" },
    { name: "Traditional American Macaroni and Cheese", category: "american", price: 420, image: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6" },
    { name: "Smoky Pulled Pork Burger with Slaw", category: "burger", price: 620, image: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90" },
    { name: "Authentic Tokyo Tonkotsu Ramen with Chashu", category: "japanese", price: 780, image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624" },
    { name: "Dragon Eye Crispy Ebi Tempura Sushi Roll", category: "japanese", price: 890, image: "https://images.unsplash.com/photo-1611143669185-af224c5e3252" },
    { name: "Sichuan Kung Pao Chicken with Cashew Nuts", category: "chinese", price: 620, image: "https://images.unsplash.com/photo-1525755662778-989d0524087e" },
    { name: "Bangkok Spicy Basil Minced Beef Rice Bowl", category: "asian", price: 590, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19" },
    { name: "Japanese Salmon Sashimi Platter (5pcs)", category: "japanese", price: 1050, image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb" },
    { name: "Traditional Cantonese Steamed Shrimp Dumplings", category: "chinese", price: 480, image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c" },
    { name: "Korean Gochujang Sticky Fried Chicken", category: "asian", price: 650, image: "https://images.unsplash.com/photo-1562967914-608f82629710" },
    { name: "Vietnamese Beef Pho Noodle Soup", category: "asian", price: 720, image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43" },
    { name: "Wok-Fried Beef Chow Mein Noodles", category: "chinese", price: 540, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246" },
    { name: "Spicy Tuna Volcano Maki Roll", category: "japanese", price: 820, image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c" },
    { name: "Royal Shahi Kacchi Mutton Biryani Platter", category: "desi", price: 550, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8" },
    { name: "Tandoori Chicken Full Platter with Mint Chutney", category: "desi", price: 750, image: "https://images.unsplash.com/photo-1599487488170-d33190226315" },
    { name: "Creamy Butter Chicken Masala with Garlic Naan", category: "desi", price: 650, image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db" },
    { name: "Hyderabadi Special Chicken Dum Biryani", category: "desi", price: 450, image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0" },
    { name: "Mughlai Beef Tehari Special", category: "desi", price: 380, image: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db" },
    { name: "Spicy Grilled Prawn Malai Curry", category: "desi", price: 890, image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641" },
    { name: "Traditional Daal Makhani with Jeera Rice", category: "desi", price: 350, image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d" },
    { name: "Achari Mutton Boti Kebab", category: "desi", price: 780, image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398" },
    { name: "Belgian Chocolate Molten Lava Cake", category: "desserts", price: 380, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c" },
    { name: "Classic New York Baked Cheesecake", category: "desserts", price: 420, image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad" },
    { name: "Traditional Italian Tiramisu with Espresso", category: "desserts", price: 450, image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9" },
    { name: "French Vanilla Crème Brûlée", category: "desserts", price: 390, image: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc" }
];

async function main() {
    console.log('🌱 Seeding database...');

    // Hash passwords securely
    const superAdminPasswordHash = await bcrypt.hash(env.SUPERADMIN_PASSWORD, 10);
    const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
    const vendorPasswordHash = await bcrypt.hash('vendor12345', 10);

    // Upsert Super Admin
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

    // Upsert Admin
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

    // Create Platform Settings default row (id = 1)
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

    // Create a Vendor & Associated Restaurant
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

    // Clear existing menu items before generating 400 unique records
    await prisma.menuItem.deleteMany({});
    console.log('📦 Generating 400 unique global menu items...');

    const menuItemsData = [];
    for (let i = 1; i <= 400; i++) {
        const baseDish = GLOBAL_DISH_POOL[(i - 1) % GLOBAL_DISH_POOL.length];
        const variantNum = Math.floor((i - 1) / GLOBAL_DISH_POOL.length) + 1;

        const uniqueName = variantNum === 1
            ? baseDish.name
            : `${baseDish.name} (${variantNum === 2 ? 'Deluxe' : variantNum === 3 ? 'Special' : 'Signature'} #${i})`;

        const neighborhood = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
        const restName = RESTAURANT_NAMES[i % RESTAURANT_NAMES.length];
        const calculatedPrice = baseDish.price + ((i * 15) % 350);
        const priceTier = calculatedPrice > 900 ? "$$$" : calculatedPrice > 550 ? "$$" : "$";

        menuItemsData.push({
            restaurantId: restaurant.id,
            menuName: uniqueName, 
            cuisineCategory: baseDish.category,
            priceTier: priceTier,
            rating: Number((4.5 + (i % 5) * 0.1).toFixed(1)),
            reviewCount: 35 + ((i * 9) % 250),
            restaurantName: restName,
            deliveryTime: `${20 + (i % 20)} mins`,
            deliveryFee: 5.0, 
            image: baseDish.image,
            imageAlt: `Freshly prepared ${uniqueName} served at ${restName}`,
            badge: i <= 6 ? "Featured Top Pick" : i % 15 === 0 ? "Chef's Special" : null,
            neighborhood: neighborhood,
            isOpen: true,
            isHalal: true,
            isVegetarianFriendly: i % 4 === 0,
            isKidFriendly: true,
            isDineIn: true,
            isDelivery: true,
            featured: i <= 6,
            name: uniqueName,
            description: `Authentic and delicious ${baseDish.category} specialty crafted with premium imported ingredients.`,
            price: Number(calculatedPrice.toFixed(2)),
            category: baseDish.category === 'desserts' ? 'Desserts' : baseDish.category === 'desi' ? 'Desi & Biryani' : 'Mains',
            imageUrl: baseDish.image,
            isAvailable: true,
            isPublished: true,
            soldCount: 50 + ((i * 3) % 500),
        });
    }

    // Insert in batches of 100 to prevent query limits
    for (let j = 0; j < menuItemsData.length; j += 100) {
        const batch = menuItemsData.slice(j, j + 100);
        await prisma.menuItem.createMany({ data: batch });
        console.log(`Inserted batch ${j / 100 + 1} (Items ${j + 1} to ${j + batch.length})`);
    }

    console.log('✅ Seeding completed successfully!');
    console.log(`👑 Super Admin: ${superAdmin.email}`);
    console.log(`🛡️ Admin: ${admin.email}`);
    console.log(`🍽️ Seeded 400 Unique Global Menu Items successfully into PostgreSQL!`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });