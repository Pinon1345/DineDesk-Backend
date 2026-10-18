import { PrismaClient, Role, RestaurantStatus, PriceRange } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

const CUISINES = ['italian', 'burger', 'sushi', 'european', 'mexican', 'desi', 'chinese', 'desserts'];
const NEIGHBORHOODS = ['Gulshan 1 & 2', 'Banani Avenue', 'Dhanmondi Satmasjid Rd', 'Uttara Sectors', 'Bashundhara R/A'];
const RESTAURANT_NAMES = [
    'Izumi Courtyard',
    'Sultan’s Heritage',
    'Madchef Gulshan',
    'The Tavern Dhaka',
    'Kacchi Bhai',
    'Santoor Bistro',
    'Hanoi Saigon',
    'Dough & Co.'
];

const MENU_IMAGES = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=800&auto=format&fit=crop'
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

    // Create a Vendor & Associated Restaurant for 300 Menus linking
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

    // Clear existing menu items before generating fresh 300 records
    await prisma.menuItem.deleteMany({});
    console.log('📦 Generating 300 high-quality menu items...');

    const menuItemsData = [];
    for (let i = 1; i <= 300; i++) {
        const cuisine = CUISINES[i % CUISINES.length];
        const neighborhood = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
        const restName = RESTAURANT_NAMES[i % RESTAURANT_NAMES.length];
        const image = MENU_IMAGES[i % MENU_IMAGES.length];

        menuItemsData.push({
            restaurantId: restaurant.id,
            menuName: `Gourmet Dish #${i} (${cuisine.toUpperCase()})`,
            cuisineCategory: cuisine,
            priceTier: i % 3 === 0 ? "$$$" : i % 2 === 0 ? "$$" : "$",
            rating: Number((4.5 + (i % 5) * 0.1).toFixed(1)),
            reviewCount: 35 + ((i * 9) % 250),
            restaurantName: restName,
            deliveryTime: `${20 + (i % 20)} mins`,
            deliveryFee: 60.0,
            image: image,
            imageAlt: `Freshly prepared ${cuisine} menu item served at ${restName}`,
            badge: i <= 6 ? "Featured Top Pick" : i % 12 === 0 ? "Chef's Special" : null,
            neighborhood: neighborhood,
            isOpen: true,
            isHalal: true,
            isVegetarianFriendly: i % 3 === 0,
            isKidFriendly: true,
            isDineIn: true,
            isDelivery: true,
            featured: i <= 6,
            name: `Menu Item #${i}`,
            description: `Authentic and delicious ${cuisine} dish crafted with premium imported ingredients.`,
            price: Number((350 + ((i * 15) % 1500)).toFixed(2)),
            category: i % 2 === 0 ? "Mains" : "Starters",
            imageUrl: image,
            isAvailable: true,
            isPublished: true,
            soldCount: 50 + ((i * 3) % 500),
        });
    }

    // Insert in batches of 100 to prevent query limits
    for (let j = 0; j < menuItemsData.length; j += 100) {
        const batch = menuItemsData.slice(j, j + 100);
        await prisma.menuItem.createMany({ data: batch });
    }

    console.log('✅ Seeding completed successfully!');
    console.log(`👑 Super Admin: ${superAdmin.email}`);
    console.log(`🛡️ Admin: ${admin.email}`);
    console.log(`🍽️ Seeded 300 Menu Items successfully into PostgreSQL!`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });