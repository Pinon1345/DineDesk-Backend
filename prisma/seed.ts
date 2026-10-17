import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Hash passwords securely
    const superAdminPasswordHash = await bcrypt.hash(env.SUPERADMIN_PASSWORD, 10);
    const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

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

    console.log('✅ Seeding completed successfully!');
    console.log(`👑 Super Admin: ${superAdmin.email}`);
    console.log(`🛡️ Admin: ${admin.email}`);
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });